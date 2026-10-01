import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, initReveal, hydrateIcons } from './layout.js';
import { templateCardHTML, setThumb } from './cards.js';
import { initTutorial } from './tutorial.js';
import { PackageViewer, renderSnapshot, defaultDesign } from './packaging.js';

renderHeader(location.hash === '#como-funciona' ? 'como' : 'inicio');
renderFooter();
hydrateIcons();

const $ = (s) => document.querySelector(s);

$('[data-features]').innerHTML = [
  ['terracota', icons.bulb, 'Creatividad', 'Plantillas, colores y elementos gráficos para expresar la identidad de tu marca.'],
  ['verde', icons.rocket, 'Emprendimiento', 'Pensado para negocios de Milagro que quieren crecer sin depender de un diseñador.'],
  ['azul', icons.pen, 'Personalización', 'Editor sencillo: cambia textos, sube tu logo y elige fondos en segundos.'],
  ['amarillo', icons.box, 'Empaques reales', 'Medidas en centímetros y plano troquelado listo para la imprenta.'],
].map(([tone, icon, title, text]) => `
  <article class="feature tone-${tone} reveal">
    <div class="ico">${icon}</div>
    <h3>${title}</h3>
    <p>${text}</p>
  </article>`).join('');

const templates = await api('/templates').catch(() => []);
const bySlug = Object.fromEntries(templates.map((t) => [t.slug, t]));
if (templates.length) $('[data-count-templates]').textContent = templates.length;

// ---------- Hero: mini configurador ----------
function heroConfigurator() {
  const shapes = [
    ['caja-rectangular', 'Caja', { text: 'TU MARCA', subtext: 'Productos naturales' }],
    ['bolsa-papel', 'Bolsa', { text: 'Café Milagro', subtext: 'Tostado artesanal', graphic: 'sun' }],
    ['frasco', 'Frasco', { text: 'Miel', subtext: 'Pura de abeja', graphic: 'flower' }],
    ['caja-regalo', 'Regalo', { text: 'Para ti', subtext: 'Hecho a mano', graphic: 'heart' }],
  ].filter(([slug]) => bySlug[slug]);
  const colors = [
    ['#DDBB99', 'Kraft', '#3A3A3A', '#4A7C59'],
    ['#F3EFE8', 'Crema', '#2B2B2B', '#D96B43'],
    ['#4A7C59', 'Verde orgánico', '#FFFFFF', '#E2A036'],
    ['#D96B43', 'Terracota', '#FFFFFF', '#FFFFFF'],
    ['#2B5B84', 'Azul', '#FFFFFF', '#E2A036'],
  ];
  let shape = shapes[0];
  let color = colors[0];

  const viewer = new PackageViewer($('[data-hero-stage]'), { autoRotate: true, label: 'Empaque de ejemplo en 3D' });
  viewer.controls.autoRotateSpeed = 1.2;
  viewer.controls.enableZoom = false;

  const update = () => {
    const t = bySlug[shape[0]];
    const [bg, , textColor, graphicColor] = color;
    viewer.setPackage(t, { ...defaultDesign(t), ...shape[2], color: bg, textColor, graphicColor, pattern: bg === '#DDBB99' ? 'kraft' : 'none', patternColor: '#FFFFFF' });
    $('[data-cta-design]').href = `/editor.html?template=${t.slug}`;
    document.querySelectorAll('[data-shape]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === shape[0])));
    document.querySelectorAll('[data-hero-colors] [data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === bg)));
  };

  $('[data-hero-shapes]').innerHTML = shapes.map(([slug, label]) => `<button type="button" data-shape="${slug}">${label}</button>`).join('');
  $('[data-hero-colors]').innerHTML = colors.map(([hex, label]) => `<button type="button" class="swatch ${hex === '#F3EFE8' || hex === '#DDBB99' ? 'light' : ''}" style="background:${hex}" data-color="${hex}" aria-label="${label}" title="${label}"></button>`).join('');
  $('[data-hero-shapes]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-shape]');
    if (b) { shape = shapes.find((s) => s[0] === b.dataset.shape); update(); }
  });
  $('[data-hero-colors]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (b) { color = colors.find((c) => c[0] === b.dataset.color); update(); }
  });
  update();
}

// ---------- Plantillas destacadas ----------
async function featured() {
  const list = ['caja-rectangular', 'bolsa-papel', 'frasco', 'caja-regalo'].map((s) => bySlug[s]).filter(Boolean);
  $('[data-featured]').innerHTML = list.map((t) => templateCardHTML(t)).join('');
  initReveal();
  for (const t of list) setThumb(t, await renderSnapshot(t, { ...defaultDesign(t), subtext: '' }, { width: 480, height: 360 }));
}

initReveal();
if (templates.length) {
  heroConfigurator();
  initTutorial($('[data-player]'), $('[data-steps]'), bySlug);
  featured();
}
