import { session, goToLogin } from './api.js';
import { icons } from './icons.js';
import { toast, hydrateIcons, busy } from './layout.js';
import { setDraft, saveDesign, loadWorkingDesign } from './store.js';
import { openExportModal } from './export-modal.js';
import {
  PackageViewer, renderSnapshot, renderDieline, defaultDesign, FONTS, COLORS, GRAPHICS, PATTERNS, graphicSVG,
} from './packaging.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const { draft, template } = await loadWorkingDesign().catch(() => ({}));
if (!template) {
  location.replace('/plantillas.html');
  throw new Error('Plantilla no encontrada');
}

const state = draft || { designId: null, templateSlug: template.slug, name: template.name, data: defaultDesign(template) };
state.data = { ...defaultDesign(template), ...state.data };
let dirty = false;
let mode = '3d';

document.title = `${state.name} · Editor · PackLab`;

// ---------- Estructura estática ----------
hydrateIcons();
$('[data-back]').innerHTML = `${icons.back}<span>Volver al catálogo</span>`;
$('[data-dims]').textContent = `${template.name} · ${template.width} × ${template.height} × ${template.depth} cm`;
$('[data-name]').value = state.name;

const tools = [
  ['p-text', icons.text, 'Texto'],
  ['p-logo', icons.logo, 'Logo'],
  ['p-color', icons.palette, 'Colores'],
  ['p-image', icons.image, 'Imágenes'],
  ['p-graphics', icons.shapes, 'Elementos gráficos'],
  ['p-background', icons.grid, 'Fondos'],
];
$('[data-tools]').innerHTML = tools.map(([id, icon, label]) => `<button type="button" class="tool" data-target="${id}" aria-controls="${id}">${icon}<span>${label}</span></button>`).join('');
const setActiveTool = (id) => $$('.tool').forEach((t) => {
  const on = t.dataset.target === id;
  t.classList.toggle('active', on);
  if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
});
$('[data-tools]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-target]');
  if (!btn) return;
  setActiveTool(btn.dataset.target);
  const section = document.getElementById(btn.dataset.target);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  section.classList.remove('flash');
  void section.offsetWidth;
  section.classList.add('flash');
  section.querySelector('input:not([type=file]), select')?.focus({ preventScroll: true });
});

$('[data-field=font]').innerHTML = FONTS.map((f) => `<option value="${f.name}" style="font-family:'${f.name}'">${f.name}</option>`).join('');

const COLOR_NAMES = {
  '#DDBB99': 'Kraft', '#F3EFE8': 'Crema', '#FFFFFF': 'Blanco', '#D96B43': 'Terracota', '#4A7C59': 'Verde orgánico',
  '#2B5B84': 'Azul', '#E2A036': 'Amarillo cálido', '#1F2A33': 'Carbón', '#3A3A3A': 'Gris oscuro',
};
const LIGHT = new Set(['#DDBB99', '#F3EFE8', '#FFFFFF', '#E2A036']);
const textColors = ['#3A3A3A', '#FFFFFF', '#1F2A33', '#2B5B84', '#4A7C59', '#D96B43', '#E2A036'];
const swatchSets = { color: COLORS, textColor: textColors, graphicColor: textColors, patternColor: ['#FFFFFF', '#1F2A33', '#D96B43', '#4A7C59', '#2B5B84', '#E2A036'] };
$$('[data-swatches]').forEach((el) => {
  const key = el.dataset.swatches;
  el.innerHTML = swatchSets[key].map((c) => `<button type="button" class="swatch ${LIGHT.has(c) ? 'light' : ''}" style="background:${c}" data-color="${c}" aria-label="${COLOR_NAMES[c] || c}" title="${COLOR_NAMES[c] || c}"></button>`).join('')
    + `<input type="color" aria-label="Elegir otro color" title="Otro color" data-custom>`;
  el.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-color]');
    if (sw) set(key, sw.dataset.color);
  });
  el.querySelector('[data-custom]').addEventListener('input', (e) => set(key, e.target.value.toUpperCase()));
});

const positions = [
  ['align', 'left', icons.alignLeft, 'Alinear a la izquierda'], ['align', 'center', icons.alignCenter, 'Centrar'],
  ['align', 'right', icons.alignRight, 'Alinear a la derecha'], ['valign', 'top', icons.alignTop, 'Arriba'],
  ['valign', 'middle', icons.alignMiddle, 'Al medio'], ['valign', 'bottom', icons.alignBottom, 'Abajo'],
];
$('[data-position]').innerHTML = positions.map(([k, v, icon, label]) => `<button type="button" class="icon-btn" data-pos="${k}:${v}" aria-label="${label}" title="${label}">${icon}</button>`).join('');
$('[data-position]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pos]');
  if (!btn) return;
  const [k, v] = btn.dataset.pos.split(':');
  set(k, v);
});

const GRAPHIC_NAMES = { leaf: 'Hojas', star: 'Estrella', flower: 'Flor', heart: 'Corazón', sun: 'Sol', seal: 'Sello' };
$('[data-graphics]').innerHTML = `<button type="button" class="icon-btn" data-graphic="" title="Sin elemento" aria-label="Sin elemento">${icons.none}</button>`
  + Object.keys(GRAPHICS).map((g) => `<button type="button" class="icon-btn" data-graphic="${g}" title="${GRAPHIC_NAMES[g] || g}" aria-label="${GRAPHIC_NAMES[g] || g}">${graphicSVG(g)}</button>`).join('');
$('[data-graphics]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-graphic]');
  if (btn) set('graphic', btn.dataset.graphic || null);
});

$('[data-patterns]').innerHTML = PATTERNS.map((p) => `<button type="button" class="chip" data-pattern="${p.key}">${p.label}</button>`).join('');
$('[data-patterns]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pattern]');
  if (btn) set('pattern', btn.dataset.pattern);
});

$$('[data-field]').forEach((el) => {
  el.addEventListener('input', () => set(el.dataset.field, el.type === 'range' ? Number(el.value) : el.value));
});

// Subida de logo / imagen: se reduce y se guarda como data URL dentro del diseño
function readImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r);
        c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.85) : c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
$$('[data-upload]').forEach((input) => input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (file) useFile(input.dataset.upload, file);
}));
$$('[data-remove]').forEach((btn) => btn.addEventListener('click', () => set(btn.dataset.remove, null)));

async function useFile(key, file) {
  if (!file || !file.type.startsWith('image/')) { toast('Elige un archivo de imagen (PNG, JPG o WebP).', { ok: false }); return; }
  if (file.size > 8 * 1024 * 1024) { toast('La imagen debe pesar menos de 8 MB.', { ok: false }); return; }
  try {
    set(key, await readImage(file, key === 'logo' ? 600 : 1200));
    toast(key === 'logo' ? 'Logo agregado' : 'Imagen agregada');
  } catch {
    toast('No se pudo leer la imagen.', { ok: false });
  }
}
[['p-logo', 'logo'], ['p-image', 'image']].forEach(([id, key]) => {
  const zone = document.getElementById(id);
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('flash'); });
  zone.addEventListener('drop', (e) => { e.preventDefault(); useFile(key, e.dataTransfer.files[0]); });
});

// ---------- Visor 3D / plano 2D ----------
const viewer = new PackageViewer($('[data-stage]'), { label: `Vista 3D de ${template.name}` });

const controls = [
  ['rotate', icons.rotate, 'Girar automáticamente'],
  ['zoom-in', icons.zoomIn, 'Acercar'],
  ['zoom-out', icons.zoomOut, 'Alejar'],
  ['reset', icons.reset, 'Restablecer vista'],
];
$('[data-controls]').innerHTML = controls.map(([k, icon, label], i) => `${i === 1 ? '<span class="div" aria-hidden="true"></span>' : ''}<button type="button" class="icon-btn" data-ctrl="${k}" aria-label="${label}" title="${label}" ${k === 'rotate' ? 'aria-pressed="false"' : ''}>${icon}</button>`).join('');
$('[data-controls]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ctrl]');
  if (!btn) return;
  const k = btn.dataset.ctrl;
  if (k === 'rotate') {
    viewer.autoRotate = !viewer.autoRotate;
    btn.classList.toggle('active', viewer.autoRotate);
    btn.setAttribute('aria-pressed', String(viewer.autoRotate));
  }
  if (k === 'zoom-in') viewer.zoom(1.25);
  if (k === 'zoom-out') viewer.zoom(0.8);
  if (k === 'reset') { viewer.setView('iso'); markAngle('iso'); }
});

const angles = [['front', 'Frente'], ['side', 'Lateral'], ['back', 'Atrás'], ['top', 'Superior'], ['iso', '3/4']];
$('[data-angles]').innerHTML = angles.map(([k, label]) => `<button type="button" data-view="${k}" aria-pressed="${k === 'iso'}">${icons.box}${label}</button>`).join('');
const markAngle = (view) => $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
$('[data-angles]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  markAngle(btn.dataset.view);
  if (mode !== '3d') setMode('3d');
  viewer.setView(btn.dataset.view);
});

function setMode(next) {
  mode = next;
  $$('[data-mode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-selected', String(b.dataset.mode === mode));
  });
  $('[data-controls]').classList.toggle('hidden', mode !== '3d');
  $('[data-flat]').classList.toggle('hidden', mode !== '2d');
  if (mode === '2d') renderFlat();
}
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

let flatToken = 0;
async function renderFlat() {
  const token = ++flatToken;
  const canvas = await renderDieline(template, state.data);
  if (token === flatToken) $('[data-flat-img]').src = canvas.toDataURL('image/png');
}

// ---------- Estado ----------
function syncControls() {
  const d = state.data;
  $$('[data-field]').forEach((el) => { if (document.activeElement !== el) el.value = d[el.dataset.field] ?? ''; });
  $('[data-size-label]').textContent = `${d.fontSize} px`;
  $$('[data-swatches]').forEach((el) => {
    const v = d[el.dataset.swatches];
    el.querySelectorAll('[data-color]').forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.color.toUpperCase() === String(v).toUpperCase())));
    el.querySelector('[data-custom]').value = /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
  });
  $$('[data-pos]').forEach((b) => {
    const [k, v] = b.dataset.pos.split(':');
    b.setAttribute('aria-pressed', String(d[k] === v));
  });
  $$('[data-graphic]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.graphic || null) === (d.graphic || null))));
  $$('[data-pattern]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pattern === d.pattern)));
  ['logo', 'image'].forEach((k) => {
    $(`[data-remove=${k}]`).disabled = !d[k];
    $(`[data-preview-of=${k}]`).style.backgroundImage = d[k] ? `url("${d[k]}")` : '';
  });
}

const SAVE_TEXT = { saved: 'Guardado', saving: 'Guardando…', dirty: 'Cambios sin guardar', new: 'Sin guardar', error: 'Error al guardar' };
function setSaveState(state) {
  const el = $('[data-save-state]');
  el.dataset.state = state;
  el.textContent = SAVE_TEXT[state];
}

let renderTimer;
function refresh() {
  syncControls();
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    viewer.setPackage(template, state.data);
    if (mode === '2d') renderFlat();
    setDraft(state);
  }, 120);
}

function set(key, value) {
  state.data[key] = value;
  dirty = true;
  setSaveState(state.designId ? 'dirty' : 'new');
  refresh();
}

$('[data-name]').addEventListener('input', (e) => {
  state.name = e.target.value.trim() || template.name;
  dirty = true;
  setSaveState(state.designId ? 'dirty' : 'new');
  document.title = `${state.name} · Editor · PackLab`;
  setDraft(state);
});

// ---------- Guardar / vista previa / exportar ----------
async function save({ silent = false } = {}) {
  if (!session.token) {
    setDraft(state);
    goToLogin();
    return null;
  }
  const restore = busy($('[data-save]'), 'Guardando');
  setSaveState('saving');
  try {
    const thumbnail = await renderSnapshot(template, state.data, { width: 480, height: 360 });
    const saved = await saveDesign(state, thumbnail);
    state.designId = saved.id;
    dirty = false;
    history.replaceState(null, '', `?design=${saved.id}`);
    setSaveState('saved');
    if (!silent) toast('Diseño guardado en Mis diseños');
    return saved.id;
  } catch (err) {
    setSaveState('error');
    toast(err.message, { ok: false });
    throw err;
  } finally {
    restore();
  }
}

$('[data-save]').addEventListener('click', () => save().catch(() => {}));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save().catch(() => {});
  }
});

$('[data-preview]').addEventListener('click', () => {
  setDraft(state);
  location.href = state.designId ? `/vista-previa.html?design=${state.designId}` : `/vista-previa.html?template=${template.slug}&borrador=1`;
});

$('[data-export]').addEventListener('click', () => openExportModal({
  template,
  getDesign: () => state,
  ensureSaved: async () => (state.designId && !dirty ? state.designId : save({ silent: true })),
  beforeLogin: () => setDraft(state),
}));

window.addEventListener('beforeunload', () => setDraft(state));

setSaveState(state.designId ? 'saved' : 'new');
syncControls();
await viewer.setPackage(template, state.data);
setDraft(state);

// Resalta la herramienta de la sección visible en el panel de propiedades
const spy = new IntersectionObserver((entries) => {
  const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (top) setActiveTool(top.target.id);
}, { root: window.matchMedia('(max-width: 960px)').matches ? null : $('.props'), threshold: 0.6 });
$$('.prop').forEach((p) => spy.observe(p));
setActiveTool('p-text');
