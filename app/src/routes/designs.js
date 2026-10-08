const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { exportStatus } = require('../billing');

const router = express.Router();
const EXPORT_FORMATS = ['png-cara', 'png-plano', 'png-3d'];

router.use(requireAuth);

function parse(row) {
  return { ...row, data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data };
}

function baseQuery(userId) {
  return db('designs as d')
    .join('templates as t', 't.id', 'd.template_id')
    .where('d.user_id', userId)
    .select('d.id', 'd.name', 'd.data', 'd.thumbnail', 'd.created_at', 'd.updated_at',
      't.slug as template_slug', 't.name as template_name', 't.shape');
}


router.get('/', async (req, res) => {
  const rows = await baseQuery(req.user.id).orderBy('d.updated_at', 'desc');
  res.json(rows.map(parse));
});

router.get('/exports/status', async (req, res) => {
  res.json(await exportStatus(req.user.id));
});

router.get('/:id', async (req, res) => {
  const row = await baseQuery(req.user.id).where('d.id', req.params.id).first();
  if (!row) return res.status(404).json({ error: 'Diseño no encontrado.' });
  res.json(parse(row));
});

router.post('/', async (req, res) => {
  const { name, template_slug: slug, data, thumbnail } = req.body;
  const template = await db('templates').where({ slug }).first();
  if (!template) return res.status(400).json({ error: 'Plantilla inválida.' });
  const [id] = await db('designs').insert({
    user_id: req.user.id,
    template_id: template.id,
    name: String(name || template.name).slice(0, 120),
    data: JSON.stringify(data || {}),
    thumbnail: thumbnail || null,
  });
  res.status(201).json(parse(await baseQuery(req.user.id).where('d.id', id).first()));
});

router.put('/:id', async (req, res) => {
  const { name, data, thumbnail } = req.body;
  const changes = { updated_at: db.fn.now() };
  if (name !== undefined) changes.name = String(name).slice(0, 120);
  if (data !== undefined) changes.data = JSON.stringify(data);
  if (thumbnail !== undefined) changes.thumbnail = thumbnail;
  const updated = await db('designs').where({ id: req.params.id, user_id: req.user.id }).update(changes);
  if (!updated) return res.status(404).json({ error: 'Diseño no encontrado.' });
  res.json(parse(await baseQuery(req.user.id).where('d.id', req.params.id).first()));
});

router.delete('/:id', async (req, res) => {
  const deleted = await db('designs').where({ id: req.params.id, user_id: req.user.id }).del();
  if (!deleted) return res.status(404).json({ error: 'Diseño no encontrado.' });
  res.status(204).end();
});

// Registra una exportación (modelo freemium: N exportaciones gratuitas por usuario).
router.post('/:id/exports', async (req, res) => {
  const design = await db('designs').where({ id: req.params.id, user_id: req.user.id }).first();
  if (!design) return res.status(404).json({ error: 'Diseño no encontrado.' });
  const format = EXPORT_FORMATS.includes(req.body.format) ? req.body.format : 'png-cara';
  const status = await exportStatus(req.user.id);
  if (!status.unlimited && status.remaining <= 0) {
    const msg = status.plan.slug === 'gratis'
      ? `Usaste tus ${status.limit} exportaciones gratuitas.`
      : `Usaste las ${status.limit} exportaciones de tu ${status.plan.name}.`;
    return res.status(402).json({ error: msg, upgrade: true, ...status });
  }
  await db('exports').insert({ user_id: req.user.id, design_id: design.id, format });
  res.status(201).json(await exportStatus(req.user.id));
});

module.exports = router;
