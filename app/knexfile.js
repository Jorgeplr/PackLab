// Configuración de Knex: migraciones y seeds para MySQL.
const env = process.env;

module.exports = {
  client: 'mysql2',
  connection: {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'packlab',
    password: env.DB_PASSWORD || 'packlab',
    database: env.DB_NAME || 'packlab',
    charset: 'utf8mb4',
  },
  pool: { min: 0, max: 10 },
  migrations: { directory: './migrations', tableName: 'knex_migrations' },
  seeds: { directory: './seeds' },
};
