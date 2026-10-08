// Planes de pago (idempotente: actualiza precios y beneficios en cada arranque).
const plans = [
  {
    slug: 'basico', name: 'Plan Básico', price_cents: 599, export_limit: 15, popular: false, sort_order: 1,
    features: ['15 exportaciones por mes', 'Vista 3D y plano troquelado', 'Descarga digital en PNG'],
  },
  {
    slug: 'premium', name: 'Plan Premium', price_cents: 999, export_limit: 50, popular: true, sort_order: 2,
    features: ['50 exportaciones por mes', 'Vista 3D y plano troquelado', 'Formatos de alta calidad', 'Todas las plantillas'],
  },
  {
    slug: 'pro', name: 'Plan Pro', price_cents: 1499, export_limit: null, popular: false, sort_order: 3,
    features: ['Exportaciones ilimitadas', 'Vista 3D y plano troquelado', 'Uso comercial', 'Soporte prioritario'],
  },
];

exports.seed = async (knex) => {
  for (const p of plans) {
    await knex('plans')
      .insert({ ...p, currency: 'USD', duration_days: 30, features: JSON.stringify(p.features) })
      .onConflict('slug').merge();
  }
};
