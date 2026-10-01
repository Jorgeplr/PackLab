#!/bin/sh
set -e

# Aplica migraciones y datos base antes de iniciar la app.
echo "Ejecutando migraciones..."
npx knex migrate:latest
echo "Cargando datos iniciales..."
npx knex seed:run

exec "$@"
