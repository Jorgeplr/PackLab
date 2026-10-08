// Planes de pago (prototipo): planes, suscripciones y pagos simulados.
exports.up = async (knex) => {
  await knex.schema.createTable('plans', (t) => {
    t.increments('id').primary();
    t.string('slug', 40).notNullable().unique();
    t.string('name', 80).notNullable();
    t.integer('price_cents').unsigned().notNullable();
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.integer('duration_days').unsigned().notNullable().defaultTo(30);
    // null = exportaciones ilimitadas
    t.integer('export_limit').unsigned().nullable();
    t.json('features').notNullable();
    t.boolean('popular').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('subscriptions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('plan_id').unsigned().notNullable().references('id').inTable('plans');
    t.string('status', 20).notNullable().defaultTo('active'); // active | replaced | cancelled
    t.timestamp('starts_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('ends_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'status', 'ends_at']);
  });

  await knex.schema.createTable('payments', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('plan_id').unsigned().notNullable().references('id').inTable('plans');
    t.integer('subscription_id').unsigned().nullable().references('id').inTable('subscriptions').onDelete('SET NULL');
    t.integer('amount_cents').unsigned().notNullable();
    t.string('currency', 3).notNullable();
    t.string('method', 20).notNullable(); // card | paypal | mercadopago
    // Nunca se guarda el número completo ni el CVC: solo marca y últimos 4 dígitos
    t.string('card_brand', 20).nullable();
    t.string('card_last4', 4).nullable();
    t.string('status', 20).notNullable(); // approved | declined
    t.string('reference', 40).notNullable().unique();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('plans');
};
