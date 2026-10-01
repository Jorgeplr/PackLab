exports.up = (knex) =>
  knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name', 120).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('users');
