# PackLab

Plataforma web para diseñar y personalizar empaques comerciales, pensada para emprendimientos y marcas locales del cantón Milagro (Guayas).

El usuario elige una plantilla, la personaliza (colores, textos, logo, elementos gráficos y fondos), la ve en 3D y exporta su diseño para imprimirlo.

## Pantallas

| # | Pantalla | Ruta |
|---|----------|------|
| 1 | Página de inicio + tutorial animado | `/` |
| 2 | Inicio de sesión / registro | `/login.html` |
| 3 | Catálogo de plantillas (filtros y búsqueda) | `/plantillas.html` |
| 4 | Editor (visor 3D + plano 2D) | `/editor.html?template=caja-rectangular` |
| 5 | Vista previa | `/vista-previa.html?design=ID` |
| 6 | Exportación (modal: plano troquelado, cara frontal o vista 3D en PNG) | desde el editor, la vista previa o Mis diseños |
| 7 | Mis diseños | `/mis-disenos.html` |

Flujo: Inicio → Iniciar sesión → Catálogo → Elegir plantilla → Editor → Visualizar en 3D → Guardar → Exportar.

## Tecnologías

- **Docker Compose**: `db` (MySQL 8.4), `app` (Node 22) y `adminer` (administrador web de la base de datos).
- **Backend**: Node.js + Express 5, autenticación JWT, contraseñas con bcrypt.
- **Base de datos**: MySQL con migraciones y seeds de **Knex**.
- **Frontend**: HTML + CSS + JavaScript (módulos ES), **Three.js** para la vista 3D, sin paso de compilación.

## Cómo levantarlo

```bash
cp .env.example .env      # opcional, los valores por defecto funcionan
docker compose up -d --build
```

- App: http://localhost:3000
- Adminer: http://localhost:8080 (servidor `db`, usuario `packlab`, contraseña `packlab`, base `packlab`)
- MySQL desde tu equipo: `localhost:3307`

Al iniciar, el contenedor `app` aplica las migraciones y carga los datos iniciales.

**Cuenta de prueba:** `demo@packlab.com` / `packlab123`

## Migraciones

Las migraciones están en `app/migrations` y los seeds en `app/seeds`.

```bash
# crear una migración nueva
docker compose exec app npx knex migrate:make agregar_algo

# aplicar / revertir
docker compose exec app npx knex migrate:latest
docker compose exec app npx knex migrate:rollback

# volver a cargar los datos iniciales (son idempotentes)
docker compose exec app npx knex seed:run
```

> Las migraciones nuevas creadas dentro del contenedor no se copian a tu carpeta local. Si quieres editarlas, créalas en local (`cd app && npx knex migrate:make nombre`) y reconstruye con `docker compose up -d --build`.

Para empezar con una base de datos limpia: `docker compose down -v && docker compose up -d --build`.

### Tablas

- `users`: cuentas de usuario.
- `categories`: Cajas, Bolsas, Etiquetas, Frascos, Alimentos, Otros.
- `templates`: plantillas con su forma 3D (`box`, `case`, `gift`, `bag`, `food`, `jar`, `label`) y medidas en cm.
- `designs`: diseños guardados por usuario (personalización en JSON + miniatura).
- `exports`: registro de exportaciones (modelo freemium: `FREE_EXPORTS`, 3 por defecto).

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve JWT) |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/categories` | Categorías |
| GET | `/api/templates?category=&q=` | Plantillas |
| GET | `/api/templates/:slug` | Detalle de plantilla |
| GET/POST | `/api/designs` | Listar / crear diseños |
| GET/PUT/DELETE | `/api/designs/:id` | Ver / actualizar / eliminar |
| GET | `/api/designs/exports/status` | Exportaciones gratuitas restantes |
| POST | `/api/designs/:id/exports` | Registrar una exportación |

## Desarrollo sin Docker para la app

```bash
docker compose up -d db
cd app && npm install
DB_HOST=127.0.0.1 DB_PORT=3307 npm run setup
DB_HOST=127.0.0.1 DB_PORT=3307 npm run dev
```

## Estructura

```
docker-compose.yml
app/
  Dockerfile, docker-entrypoint.sh, knexfile.js
  migrations/   seeds/
  src/          servidor Express (rutas auth, catálogo, diseños)
  public/       frontend (páginas HTML, css/, js/)
    js/packaging.js   dibujo de caras, modelos 3D y plano troquelado
```
