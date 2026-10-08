import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, initReveal, hydrateIcons } from './layout.js';
import { templateCardHTML, setThumb } from './cards.js';
import { initTutorial } from './tutorial.js';
import { initSlider } from './slider.js';
import { PackageViewer, renderSnapshot, defaultDesign } from './packaging.js';

renderHeader('inicio');
renderFooter();
hydrateIcons();

const $ = (s) => document.querySelector(s);
initSlider($('[data-slider]'));

$('[data-features]').innerHTML = [
  ['terracota', icons.box, 'Plantillas con medidas reales', 'Cajas, bolsas, frascos y etiquetas listas para personalizar. Ajusta ancho, alto y fondo en centímetros.'],
  ['verde', icons.pen, 'Editor visual sencillo', 'Cambia colores, textos y fuentes, sube tu logo y mueve cada elemento arrastrándolo.'],
  ['amarillo', icons.rotate, 'Visor 3D en tiempo real', 'Gira tu empaque y revísalo desde todos los ángulos antes de imprimir.'],
  ['azul', icons.dieline, 'Plano troquelado', 'Descarga el plano con líneas de corte y doblez para llevarlo a cualquier imprenta.'],
].map(([tone, icon, title, text]) => `
  <article class="feature tone-${tone} reveal">
    <div class="ico">${icon}</div>
    <h3>${title}</h3>
    <p>${text}</p>
  </article>`).join('');

$('[data-values]').innerHTML = [
  [icons.bulb, 'Creatividad'], [icons.rocket, 'Emprendimiento'], [icons.pen, 'Personalización'], [icons.leaf, 'Empaques sostenibles'],
].map(([icon, label]) => `<li>${icon}${label}</li>`).join('');

const templates = await api('/templates').catch(() => []);
const bySlug = Object.fromEntries(templates.map((t) => [t.slug, t]));
if (templates.length) $('[data-count-templates]').textContent = templates.length;

// ---------- Hero: mini configurador ----------
function heroConfigurator() {
  const shapes = [
    ['caja-rectangular', 'Caja', { text: 'TU MARCA', subtext: 'Productos naturales', graphic: 'branch' }],
    ['bolsa-papel', 'Bolsa', { text: 'Café Milagro', subtext: 'Tostado artesanal', graphic: 'sun' }],
    ['frasco', 'Frasco', { text: 'Miel', subtext: 'Pura de abeja', graphic: 'flower' }],
    ['caja-regalo', 'Regalo', { text: 'Para ti', subtext: 'Hecho a mano', graphic: 'heart' }],
  ].filter(([slug]) => bySlug[slug]);
  const colors = [
    ['#F6E1C8', 'Crema', '#6A2D13', '#C0532D', 'organic'],
    ['#DDB48C', 'Kraft', '#6A2D13', '#5B7B52', 'kraft'],
    ['#F0BE88', 'Durazno', '#6A2D13', '#C0532D', 'none'],
    ['#C0532D', 'Terracota', '#FFFFFF', '#F0BE88', 'none'],
    ['#5B7B52', 'Verde salvia', '#FFFFFF', '#F0BE88', 'none'],
  ];
  let shape = shapes[0];
  let color = colors[0];

  const viewer = new PackageViewer($('[data-hero-stage]'), { autoRotate: true, label: 'Empaque de ejemplo en 3D' });
  viewer.controls.autoRotateSpeed = 1.2;
  viewer.controls.enableZoom = false;

  const update = () => {
    const t = bySlug[shape[0]];
    const [bg, , textColor, graphicColor, pattern] = color;
    viewer.setPackage(t, { ...defaultDesign(t), ...shape[2], color: bg, textColor, graphicColor, pattern, patternColor: '#E9A27A' });
    $('[data-try-cta]').href = `/editor.html?template=${t.slug}`;
    document.querySelectorAll('[data-shape]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === shape[0])));
    document.querySelectorAll('[data-hero-colors] [data-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === bg)));
  };

  $('[data-hero-shapes]').innerHTML = shapes.map(([slug, label]) => `<button type="button" data-shape="${slug}">${label}</button>`).join('');
  $('[data-hero-colors]').innerHTML = colors.map(([hex, label]) => `<button type="button" class="swatch ${['#F6E1C8', '#DDB48C', '#F0BE88'].includes(hex) ? 'light' : ''}" style="background:${hex}" data-color="${hex}" aria-label="${label}" title="${label}"></button>`).join('');
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
