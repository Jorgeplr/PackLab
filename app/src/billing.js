// Plan activo y cuota de exportaciones de un usuario.
const db = require('./db');

const FREE_EXPORTS = Number(process.env.FREE_EXPORTS || 3);

function parsePlan(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    price_cents: row.price_cents,
    currency: row.currency,
    duration_days: row.duration_days,
    export_limit: row.export_limit,
    popular: !!row.popular,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
  };
}

async function activeSubscription(userId) {
  return db('subscriptions as s')
    .join('plans as p', 'p.id', 's.plan_id')
    .where({ 's.user_id': userId, 's.status': 'active' })
    .andWhere('s.ends_at', '>', db.fn.now())
    .orderBy('s.ends_at', 'desc')
    .select('s.id as subscription_id', 's.starts_at', 's.ends_at', 'p.*')
    .first();
}

/**
 * Estado de exportaciones: con plan activo se cuentan las exportaciones desde que empezó;
 * sin plan, el plan gratuito permite FREE_EXPORTS en total.
 */
async function exportStatus(userId) {
  const sub = await activeSubscription(userId);
  const q = db('exports').where({ user_id: userId });
  if (sub) q.andWhere('created_at', '>=', sub.starts_at);
  const { used } = await q.count({ used: '*' }).first();
  const limit = sub ? sub.export_limit : FREE_EXPORTS; // null = ilimitado
  return {
    plan: sub ? { ...parsePlan(sub), starts_at: sub.starts_at, ends_at: sub.ends_at } : { slug: 'gratis', name: 'Plan Gratis', export_limit: FREE_EXPORTS },
    used: Number(used),
    limit,
    unlimited: limit === null,
    remaining: limit === null ? null : Math.max(0, limit - Number(used)),
  };
}

module.exports = { FREE_EXPORTS, parsePlan, activeSubscription, exportStatus };
