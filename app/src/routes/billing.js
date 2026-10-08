// Pagos (PROTOTIPO): pasarela simulada, no se realizan cobros reales.
// El servidor nunca recibe el número completo de la tarjeta ni el CVC.
const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { FREE_EXPORTS, parsePlan, exportStatus } = require('../billing');

const router = express.Router();
const METHODS = ['card', 'paypal', 'mercadopago'];
const BRANDS = ['visa', 'mastercard', 'amex', 'otra'];

router.get('/plans', async (req, res) => {
  const rows = await db('plans').orderBy('sort_order');
  res.json({ free_exports: FREE_EXPORTS, plans: rows.map(parsePlan) });
});

router.get('/billing/me', requireAuth, async (req, res) => {
  res.json(await exportStatus(req.user.id));
});

router.get('/billing/payments', requireAuth, async (req, res) => {
  const rows = await db('payments as pay').join('plans as p', 'p.id', 'pay.plan_id')
    .where('pay.user_id', req.user.id).orderBy('pay.created_at', 'desc').limit(50)
    .select('pay.reference', 'pay.amount_cents', 'pay.currency', 'pay.method', 'pay.card_brand', 'pay.card_last4', 'pay.status', 'pay.created_at', 'p.name as plan');
  res.json(rows);
});

router.post('/billing/checkout', requireAuth, async (req, res) => {
  const { plan: slug, method, card } = req.body || {};
  const plan = await db('plans').where({ slug }).first();
  if (!plan) return res.status(400).json({ error: 'Plan inválido.' });
  if (!METHODS.includes(method)) return res.status(400).json({ error: 'Método de pago inválido.' });

  let brand = null;
  let last4 = null;
  if (method === 'card') {
    last4 = String(card?.last4 || '');
    brand = BRANDS.includes(card?.brand) ? card.brand : 'otra';
    const month = Number(card?.expMonth);
    const year = Number(card?.expYear);
    if (!/^\d{4}$/.test(last4)) return res.status(400).json({ error: 'Datos de tarjeta incompletos.' });
    const now = new Date();
    const expired = !(month >= 1 && month <= 12) || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    if (expired) return res.status(400).json({ error: 'La tarjeta está vencida.' });
  }

  // Simulación de la pasarela: la tarjeta de prueba terminada en 0002 es rechazada
  const approved = !(method === 'card' && last4 === '0002');
  const reference = `PL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const result = await db.transaction(async (trx) => {
    let subscriptionId = null;
    let endsAt = null;
    if (approved) {
      await trx('subscriptions').where({ user_id: req.user.id, status: 'active' }).update({ status: 'replaced' });
      endsAt = new Date(Date.now() + plan.duration_days * 86400000);
      [subscriptionId] = await trx('subscriptions').insert({ user_id: req.user.id, plan_id: plan.id, status: 'active', ends_at: endsAt });
    }
    await trx('payments').insert({
      user_id: req.user.id, plan_id: plan.id, subscription_id: subscriptionId,
      amount_cents: plan.price_cents, currency: plan.currency, method,
      card_brand: brand, card_last4: last4, status: approved ? 'approved' : 'declined', reference,
    });
    return { endsAt };
  });

  if (!approved) {
    return res.status(402).json({ error: 'El pago fue rechazado por el banco (tarjeta de prueba de rechazo). Prueba con otra tarjeta.', reference });
  }
  res.status(201).json({
    reference,
    plan: parsePlan(plan),
    amount_cents: plan.price_cents,
    currency: plan.currency,
    method,
    card_brand: brand,
    card_last4: last4,
    ends_at: result.endsAt,
    status: await exportStatus(req.user.id),
  });
});

module.exports = router;
