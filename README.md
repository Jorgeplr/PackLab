# PackLab

Plataforma web para diseñar y personalizar empaques comerciales, pensada para emprendimientos y marcas locales del cantón Milagro (Guayas).

El usuario elige una plantilla, la personaliza (colores, textos, logo, elementos gráficos y fondos), la ve en 3D y exporta su diseño para imprimirlo.

## Pantallas

| # | Pantalla | Ruta |
|---|----------|------|
| 1 | Inicio: carrusel, Nosotros, Servicio, configurador 3D, tutorial animado | `/` |
| 2 | Inicio de sesión / registro | `/login.html` |
| 3 | Tienda: catálogo de plantillas (filtros y búsqueda) | `/plantillas.html` |
| — | Blog con consejos de empaque | `/blog.html` |
| — | Planes de pago y checkout (prototipo) | `/planes.html`, `/checkout.html?plan=premium` |
| 4 | Editor (visor 3D, cara frontal editable y plano 2D; medidas, deshacer/rehacer) | `/editor.html?template=caja-rectangular` |
| 5 | Vista previa | `/vista-previa.html?design=ID` |
| 6 | Exportación (modal: plano troquelado, cara frontal o vista 3D en PNG) | desde el editor, la vista previa o Mis diseños |
| 7 | Mis diseños | `/mis-disenos.html` |

Flujo: Inicio → Iniciar sesión → Catálogo → Elegir plantilla → Editor → Visualizar en 3D → Guardar → Exportar.

## Diseño

La interfaz sigue la **guía de marca de PackLab** (logo e imágenes en `app/public/img/`), revisada con la guía **UI UX Pro Max**:

- **Logo**: `img/logo.png` (horizontal) e `img/logo-mark.png` (ícono, también favicon).
- **Paleta**: terracota `#C0532D` (botones `#A9461F`, contraste 5.9:1), durazno `#F0BE88`, kraft `#DDB48C`, crema `#FAF3EA`, café `#6A2D13` (color del logotipo, títulos y botones oscuros) y verde salvia `#5B7B52`.
- **Tipografía**: Montserrat (títulos, como el logotipo), Nunito (texto) y Space Mono (medidas), alojadas en el propio servidor con `@fontsource` (`app/public/css/fonts.css`).
- **Inicio**: carrusel con las imágenes de la marca (pausable, con flechas, puntos, teclado y gesto de deslizar; sin autoplay con *reducir movimiento*).
- **Editor**: colores de la marca, fondo **Orgánico** (manchas como en los empaques de la guía) y gráfico **Rama** en línea.
- Accesibilidad: contraste ≥ 4.5:1, foco visible, objetivos táctiles de 44 px, controles de teclado en el visor 3D y respeto a `prefers-reduced-motion`.

## Planes de pago (prototipo)

> **Prototipo académico: la pasarela está simulada y no se realizan cobros.**

| Plan | Precio (30 días) | Exportaciones |
|------|------------------|---------------|
| Gratis | — | 3 en total (`FREE_EXPORTS`) |
| Básico | $5,99 | 15 |
| Premium (más popular) | $9,99 | 50 |
| Pro | $14,99 | ilimitadas |

- Flujo: **Planes → Pago (tarjeta, PayPal o Mercado Pago) → ¡Pago exitoso!** El plan se activa por 30 días y reemplaza al anterior; la cuota de exportaciones depende del plan activo.
- Tarjetas de prueba: `4242 4242 4242 4242` (aprobada) y `4000 0000 0000 0002` (rechazada), con cualquier fecha futura y CVC.
- **Seguridad:** la tarjeta se valida en el navegador (Luhn, vencimiento, CVC) y al servidor solo llegan la marca, los últimos 4 dígitos y el vencimiento. Nunca se envía ni se guarda el número completo ni el CVC.
- Tablas: `plans` (seed `03_plans.js`), `subscriptions` y `payments`. API: `GET /api/plans`, `GET /api/billing/me`, `GET /api/billing/payments`, `POST /api/billing/checkout`.
- Para pasar a pagos reales se reemplaza la simulación de `src/routes/billing.js` por la pasarela elegida (Stripe, PayPal o Mercado Pago), usando sus formularios alojados para no manejar datos de tarjetas.

## Editor

- **Medidas**: ancho, alto y fondo en cm (diámetro y alto en frascos). El modelo 3D y el plano troquelado se recalculan.
- **Cara frontal**: arrastra el logo, el gráfico, el texto y el eslogan (o muévelos con Tab + flechas). Los botones de posición vuelven a la disposición automática.
- **Deshacer / rehacer**: botones en la barra superior, `Ctrl+Z` y `Ctrl+Y` (o `Ctrl+Shift+Z`).

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

**Usuario master** (lo crea la migración `20261002000001_add_role_and_master_user`): `master@packlab.com` / `PackLab2026!`
Se puede cambiar con `MASTER_EMAIL`, `MASTER_PASSWORD` y `MASTER_NAME` **antes del primer despliegue** (la migración se ejecuta una sola vez). Cambia la contraseña por defecto en producción.

**Cuenta de prueba:** `demo@packlab.com` / `packlab123`

## Despliegue en Dokploy

1. **Create Service → Compose**.
2. Provider **GitHub**: repositorio `Jorgeplr/PackLab`, rama `claude/relaxed-allen-n0jby3` (o `main`), **Compose Path** `./docker-compose.prod.yml`.
3. Pestaña **Environment**:
   ```
   DB_PASSWORD=una-contraseña-segura
   DB_ROOT_PASSWORD=otra-contraseña-segura
   JWT_SECRET=una-cadena-larga-y-aleatoria
   ```
4. Pestaña **Domains → Add Domain**: servicio `app`, puerto `3000`. Usa *Generate* para un dominio gratuito `*.traefik.me` o pon tu propio dominio.
5. **Deploy**. Las migraciones y datos iniciales se aplican solos al arrancar.

`docker-compose.prod.yml` no publica puertos en el servidor (el 3000 lo usa Dokploy) ni incluye Adminer.

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

- `users`: cuentas de usuario, con `role` (`user` o `master`).
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
