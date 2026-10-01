exports.up = async (knex) => {
  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.string('name', 80).notNullable();
    t.string('slug', 80).notNullable().unique();
    t.integer('sort_order').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('templates', (t) => {
    t.increments('id').primary();
    t.integer('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('CASCADE');
    t.string('name', 120).notNullable();
    t.string('slug', 120).notNullable().unique();
    t.string('description', 255);
    // Forma 3D que dibuja el visor: box | case | gift | bag | food | jar | label
    t.string('shape', 20).notNullable();
    // Medidas en centímetros (ancho x alto x profundidad)
    t.decimal('width', 6, 1).notNullable();
    t.decimal('height', 6, 1).notNullable();
    t.decimal('depth', 6, 1).notNullable();
    t.string('base_color', 7).notNullable().defaultTo('#DDBB99');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('templates');
  await knex.schema.dropTableIfExists('categories');
};
