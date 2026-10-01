// Usuario de demostración: demo@packlab.com / packlab123
const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  const exists = await knex('users').where({ email: 'demo@packlab.com' }).first();
  if (exists) return;
  await knex('users').insert({
    name: 'Usuario Demo',
    email: 'demo@packlab.com',
    password_hash: await bcrypt.hash('packlab123', 10),
  });
};
