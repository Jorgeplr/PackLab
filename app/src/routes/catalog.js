const express = require('express');
const db = require('../db');

const router = express.Router();

const templateColumns = [
  't.id', 't.name', 't.slug', 't.description', 't.shape', 't.width', 't.height', 't.depth',
  't.base_color', 'c.name as category', 'c.slug as category_slug',
];

function normalize(t) {
  return { ...t, width: Number(t.width), height: Number(t.height), depth: Number(t.depth) };
}

router.get('/categories', async (req, res) => {
  res.json(await db('categories').orderBy('sort_order'));
});

router.get('/templates', async (req, res) => {
  const q = db('templates as t').join('categories as c', 'c.id', 't.category_id')
    .where('t.active', true).select(templateColumns).orderBy('t.id');
  if (req.query.category) q.where('c.slug', req.query.category);
  if (req.query.q) q.where('t.name', 'like', `%${req.query.q}%`);
  res.json((await q).map(normalize));
});

router.get('/templates/:slug', async (req, res) => {
  const t = await db('templates as t').join('categories as c', 'c.id', 't.category_id')
    .where('t.slug', req.params.slug).select(templateColumns).first();
  if (!t) return res.status(404).json({ error: 'Plantilla no encontrada.' });
  res.json(normalize(t));
});

module.exports = router;
