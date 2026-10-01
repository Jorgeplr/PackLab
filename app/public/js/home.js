import { Group } from 'three';
import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader } from './layout.js';
import { PackageViewer, buildPackage, defaultDesign } from './packaging.js';

renderHeader(location.hash === '#como-funciona' ? 'como' : 'inicio');

document.querySelector('[data-features]').innerHTML = [
  [icons.bulb, 'Creatividad'], [icons.rocket, 'Emprendimiento'], [icons.pen, 'Personalización'], [icons.box, 'Empaques'],
].map(([icon, label]) => `<div>${icon}${label}</div>`).join('');

document.querySelector('[data-flow]').innerHTML = ['Inicio', 'Iniciar sesión', 'Catálogo', 'Elegir plantilla', 'Editor', 'Visualizar en 3D', 'Guardar', 'Exportar']
  .map((s) => `<span class="step">${s}</span>`).join('<span class="arrow">→</span>');

const templates = await api('/templates').catch(() => []);
const bySlug = Object.fromEntries(templates.map((t) => [t.slug, t]));

// ---------- Composición 3D del hero ----------
async function heroScene() {
  const stage = document.querySelector('[data-hero-stage]');
  const viewer = new PackageViewer(stage, { autoRotate: true });
  viewer.controls.autoRotateSpeed = 0.6;
  viewer.controls.enableZoom = false;
  const layout = [
    ['caja-rectangular', -1.7, 0.4, 0.85, 0.3, { text: 'TU MARCA' }],
    ['bolsa-papel', 1.6, -0.4, 1.05, -0.4, { text: 'Café Milagro', graphic: 'sun', graphicColor: '#E2A036', textColor: '#2B2B2B' }],
    ['caja-regalo', 0.1, 1.5, 0.7, 0.2, { text: '', subtext: '', graphic: null }],
    ['frasco', -0.2, -1.1, 0.6, 0, { color: '#4A7C59', text: 'Miel', subtext: 'Natural', textColor: '#FFFFFF', graphic: 'flower', graphicColor: '#E2A036' }],
    ['caja-maletin', 2.9, 1.6, 0.7, -0.6, { text: '', subtext: 'Hecho a mano', graphic: 'leaf' }],
  ].filter(([slug]) => bySlug[slug]);

  const models = await Promise.all(layout.map(async ([slug, x, z, scale, rot, overrides]) => {
    const t = bySlug[slug];
    const g = await buildPackage(t, { ...defaultDesign(t), ...overrides });
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    g.rotation.y = rot;
    return g;
  }));
  const group = new Group();
  group.add(...models);
  viewer.setGroup(group);
}

// ---------- Tutorial animado ("video") ----------
function tutorial() {
  const root = document.querySelector('[data-player]');
  const $ = (s) => root.querySelector(s);
  const steps = [...document.querySelectorAll('[data-steps] li')];
  const viewer = new PackageViewer(root);
  viewer.controls.enableZoom = false;
  const DURATION = 24;
  const captions = ['1 · Elige tu plantilla', '2 · Personaliza', '3 · Visualiza en 3D', '4 · Exporta e imprime'];
  const keyframes = [
    [0, 'caja-rectangular', { text: '', subtext: '', graphic: null }, 'iso'],
    [2, 'bolsa-papel', { text: '', subtext: '', graphic: null }, 'iso'],
    [4, 'caja-rectangular', { text: '', subtext: '', graphic: null }, 'iso'],
    [6, 'caja-rectangular', { color: '#F3EFE8', text: '', subtext: '', graphic: 'leaf' }, 'iso'],
    [7.5, 'caja-rectangular', { color: '#F3EFE8', text: 'TU MARCA', subtext: '', graphic: 'leaf' }, 'iso'],
    [9, 'caja-rectangular', { color: '#4A7C59', text: 'TU MARCA', subtext: 'Productos naturales', textColor: '#FFFFFF', graphicColor: '#E2A036' }, 'iso'],
    [10.5, 'caja-rectangular', { color: '#D96B43', text: 'TU MARCA', subtext: 'Productos naturales', textColor: '#FFFFFF', graphicColor: '#FFFFFF', pattern: 'dots' }, 'iso'],
    [12, null, null, 'front'],
    [14, null, null, 'side'],
    [16, null, null, 'top'],
    [18, null, null, 'iso'],
  ];
  let t = 0;
  let playing = false;
  let last = 0;
  let k = -1;

  const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;
  const setIcons = () => {
    $('[data-toggle]').innerHTML = playing ? icons.pause : icons.play;
    $('[data-play]').innerHTML = icons.play;
    $('[data-play]').classList.toggle('hidden', playing);
  };
  $('[data-full]').innerHTML = icons.expand;

  async function apply(i) {
    const [, slug, overrides, view] = keyframes[i];
    if (slug && bySlug[slug]) await viewer.setPackage(bySlug[slug], { ...defaultDesign(bySlug[slug]), ...overrides });
    viewer.setView(view);
  }

  function render() {
    const step = Math.min(3, Math.floor(t / 6));
    steps.forEach((li, i) => li.classList.toggle('active', i === step));
    $('[data-caption]').textContent = t >= DURATION ? '¡Listo para imprimir!' : captions[step];
    $('[data-progress]').style.width = `${(t / DURATION) * 100}%`;
    $('[data-time]').textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    let next = k;
    while (next + 1 < keyframes.length && keyframes[next + 1][0] <= t) next++;
    if (next !== k) { k = next; apply(k); }
  }

  function tick(now) {
    if (!playing) return;
    t = Math.min(DURATION, t + (now - last) / 1000);
    last = now;
    viewer.autoRotate = t > 18;
    render();
    if (t >= DURATION) { playing = false; setIcons(); return; }
    requestAnimationFrame(tick);
  }

  function toggle() {
    if (t >= DURATION) { t = 0; k = -1; }
    playing = !playing;
    setIcons();
    if (playing) { last = performance.now(); requestAnimationFrame(tick); }
  }

  $('[data-play]').addEventListener('click', toggle);
  $('[data-toggle]').addEventListener('click', toggle);
  $('[data-full]').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.()));
  setIcons();
  render();
}

if (templates.length) {
  heroScene();
  tutorial();
}
