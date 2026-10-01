import { session, goToLogin } from './api.js';
import { icons } from './icons.js';
import { toast } from './layout.js';
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
$('[data-back]').innerHTML = `${icons.back} Volver al catálogo`;
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
$('[data-tools]').innerHTML = tools.map(([id, icon, label]) => `<button class="tool" data-target="${id}">${icon}${label}</button>`).join('');
$('[data-tools]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-target]');
  if (!btn) return;
  $$('.tool').forEach((t) => t.classList.toggle('active', t === btn));
  const section = document.getElementById(btn.dataset.target);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  section.classList.remove('flash');
  void section.offsetWidth;
  section.classList.add('flash');
  section.querySelector('input:not([type=file]), select')?.focus({ preventScroll: true });
});

$('[data-field=font]').innerHTML = FONTS.map((f) => `<option value="${f.name}" style="font-family:'${f.name}'">${f.name}</option>`).join('');

const textColors = ['#3A3A3A', '#FFFFFF', '#1F2A33', '#2B5B84', '#4A7C59', '#D96B43', '#E2A036'];
const swatchSets = { color: COLORS, textColor: textColors, graphicColor: textColors, patternColor: ['#FFFFFF', '#1F2A33', '#D96B43', '#4A7C59', '#2B5B84', '#E2A036'] };
$$('[data-swatches]').forEach((el) => {
  const key = el.dataset.swatches;
  el.innerHTML = swatchSets[key].map((c) => `<button class="swatch" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')
    + `<input type="color" aria-label="Color personalizado" data-custom>`;
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
$('[data-position]').innerHTML = positions.map(([k, v, icon, label]) => `<button class="icon-btn" data-pos="${k}:${v}" aria-label="${label}" title="${label}">${icon}</button>`).join('');
$('[data-position]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pos]');
  if (!btn) return;
  const [k, v] = btn.dataset.pos.split(':');
  set(k, v);
});

$('[data-graphics]').innerHTML = `<button class="icon-btn" data-graphic="" title="Sin elemento" aria-label="Sin elemento">${icons.none}</button>`
  + Object.keys(GRAPHICS).map((g) => `<button class="icon-btn" data-graphic="${g}" title="${g}" aria-label="Elemento ${g}">${graphicSVG(g)}</button>`).join('');
$('[data-graphics]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-graphic]');
  if (btn) set('graphic', btn.dataset.graphic || null);
});

$('[data-patterns]').innerHTML = PATTERNS.map((p) => `<button class="chip" data-pattern="${p.key}">${p.label}</button>`).join('');
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
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('La imagen debe pesar menos de 8 MB.'); return; }
  try {
    set(input.dataset.upload, await readImage(file, input.dataset.upload === 'logo' ? 600 : 1200));
  } catch {
    toast('No se pudo leer la imagen.');
  }
}));
$$('[data-remove]').forEach((btn) => btn.addEventListener('click', () => set(btn.dataset.remove, null)));

// ---------- Visor 3D / plano 2D ----------
const viewer = new PackageViewer($('[data-stage]'));

const controls = [
  ['rotate', icons.rotate, 'Girar automáticamente'],
  ['zoom-in', icons.zoomIn, 'Acercar'],
  ['zoom-out', icons.zoomOut, 'Alejar'],
  ['reset', icons.reset, 'Restablecer vista'],
];
$('[data-controls]').innerHTML = controls.map(([k, icon, label]) => `<button class="icon-btn" data-ctrl="${k}" aria-label="${label}" title="${label}">${icon}</button>`).join('');
$('[data-controls]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ctrl]');
  if (!btn) return;
  const k = btn.dataset.ctrl;
  if (k === 'rotate') { viewer.autoRotate = !viewer.autoRotate; btn.classList.toggle('active', viewer.autoRotate); }
  if (k === 'zoom-in') viewer.zoom(1.25);
  if (k === 'zoom-out') viewer.zoom(0.8);
  if (k === 'reset') viewer.setView('iso');
});

const angles = [['front', 'Frente'], ['side', 'Lateral'], ['back', 'Atrás'], ['top', 'Superior'], ['iso', '3/4']];
$('[data-angles]').innerHTML = angles.map(([k, label]) => `<button data-view="${k}" class="${k === 'iso' ? 'active' : ''}">${icons.box}<br>${label}</button>`).join('');
$('[data-angles]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  $$('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
  if (mode !== '3d') setMode('3d');
  viewer.setView(btn.dataset.view);
});
$$('[data-angles] svg').forEach((s) => { s.style.width = '18px'; s.style.height = '18px'; });

function setMode(next) {
  mode = next;
  $$('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
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
    el.querySelectorAll('[data-color]').forEach((s) => s.classList.toggle('active', s.dataset.color.toUpperCase() === String(v).toUpperCase()));
    el.querySelector('[data-custom]').value = /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
  });
  $$('[data-pos]').forEach((b) => {
    const [k, v] = b.dataset.pos.split(':');
    b.classList.toggle('active', d[k] === v);
  });
  $$('[data-graphic]').forEach((b) => b.classList.toggle('active', (b.dataset.graphic || null) === (d.graphic || null)));
  $$('[data-pattern]').forEach((b) => b.classList.toggle('active', b.dataset.pattern === d.pattern));
  $('[data-remove=logo]').disabled = !d.logo;
  $('[data-remove=image]').disabled = !d.image;
}

function setSaveState(text) { $('[data-save-state]').textContent = text; }

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
  setSaveState(state.designId ? 'Cambios sin guardar' : 'Sin guardar');
  refresh();
}

$('[data-name]').addEventListener('input', (e) => {
  state.name = e.target.value.trim() || template.name;
  dirty = true;
  setSaveState('Cambios sin guardar');
  setDraft(state);
});

// ---------- Guardar / vista previa / exportar ----------
async function save({ silent = false } = {}) {
  if (!session.token) {
    setDraft(state);
    goToLogin();
    return null;
  }
  const btn = $('[data-save]');
  btn.disabled = true;
  setSaveState('Guardando...');
  try {
    const thumbnail = await renderSnapshot(template, state.data, { width: 480, height: 360 });
    const saved = await saveDesign(state, thumbnail);
    state.designId = saved.id;
    dirty = false;
    history.replaceState(null, '', `?design=${saved.id}`);
    setSaveState('Guardado');
    if (!silent) toast('Diseño guardado en Mis diseños');
    return saved.id;
  } catch (err) {
    setSaveState('Error al guardar');
    toast(err.message);
    throw err;
  } finally {
    btn.disabled = false;
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

setSaveState(state.designId ? 'Guardado' : 'Sin guardar');
syncControls();
await viewer.setPackage(template, state.data);
setDraft(state);
document.querySelector('.tool')?.classList.add('active');
