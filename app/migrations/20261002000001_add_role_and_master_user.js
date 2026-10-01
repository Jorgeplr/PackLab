// Agrega el rol de usuario y crea el usuario master por defecto.
// Credenciales configurables con MASTER_EMAIL / MASTER_PASSWORD / MASTER_NAME.
const bcrypt = require('bcryptjs');

const MASTER_EMAIL = (process.env.MASTER_EMAIL || 'master@packlab.com').trim().toLowerCase();
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'PackLab2026!';
const MASTER_NAME = process.env.MASTER_NAME || 'Administrador PackLab';

exports.up = async (knex) => {
  await knex.schema.alterTable('users', (t) => {
    t.string('role', 20).notNullable().defaultTo('user').after('password_hash');
  });

  const existing = await knex('users').where({ email: MASTER_EMAIL }).first();
  if (existing) {
    await knex('users').where({ id: existing.id }).update({ role: 'master' });
    return;
  }
  await knex('users').insert({
    name: MASTER_NAME,
    email: MASTER_EMAIL,
    password_hash: await bcrypt.hash(MASTER_PASSWORD, 10),
    role: 'master',
  });
};

exports.down = async (knex) => {
  await knex('users').where({ email: MASTER_EMAIL, role: 'master' }).del();
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('role');
  });
};
