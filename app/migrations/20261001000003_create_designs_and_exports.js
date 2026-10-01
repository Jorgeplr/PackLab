exports.up = async (knex) => {
  await knex.schema.createTable('designs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('template_id').unsigned().notNullable()
      .references('id').inTable('templates').onDelete('CASCADE');
    t.string('name', 120).notNullable();
    // Personalización: colores, textos, fuente, logo, elementos gráficos, fondo...
    t.json('data').notNullable();
    // Miniatura PNG (data URL) generada por el editor
    t.text('thumbnail', 'mediumtext');
    t.timestamps(true, true);
    t.index(['user_id', 'updated_at']);
  });

  await knex.schema.createTable('exports', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('design_id').unsigned().notNullable()
      .references('id').inTable('designs').onDelete('CASCADE');
    t.string('format', 20).notNullable(); // png-cara | png-plano | png-3d
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('exports');
  await knex.schema.dropTableIfExists('designs');
};
