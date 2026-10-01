import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, escapeHTML } from './layout.js';
import { setDraft, loadWorkingDesign } from './store.js';
import { openExportModal } from './export-modal.js';
import { PackageViewer, renderSnapshot, defaultDesign } from './packaging.js';

renderHeader('plantillas');
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

let { draft, template } = await loadWorkingDesign(params).catch(() => ({}));
if (!template) {
  location.replace('/plantillas.html');
  throw new Error('Sin diseño para previsualizar');
}

// "Ver plantilla" desde el catálogo muestra la plantilla base, no el borrador.
const templateOnly = !params.has('design') && !params.has('borrador');
if (templateOnly) draft = null;
const state = draft || { designId: null, templateSlug: template.slug, name: template.name, data: defaultDesign(template) };
const editUrl = state.designId ? `/editor.html?design=${state.designId}` : `/editor.html?template=${template.slug}`;

$('[data-back]').innerHTML = `${icons.back} ${templateOnly ? 'Volver al catálogo' : 'Volver al editor'}`;
$('[data-back]').href = templateOnly ? '/plantillas.html' : editUrl;
$('[data-edit]').href = editUrl;
if (templateOnly) {
  $('[data-title]').textContent = template.name;
  $('[data-ready-title]').textContent = `${template.category} · ${template.width} × ${template.height} × ${template.depth} cm`;
  $('[data-ready-sub]').textContent = template.description || '';
  $('[data-edit]').textContent = 'Personalizar';
  $('[data-edit]').className = 'btn btn-primary';
  $('[data-export]').remove();
} else {
  $('[data-title]').textContent = `Vista previa: ${state.name}`;
}
document.title = `${state.name} · Vista previa · PackLab`;

const viewer = new PackageViewer($('[data-stage]'), { autoRotate: false });
await viewer.setPackage(template, state.data);

const controls = [
  ['rotate', icons.rotate, 'Rotar'],
  ['zoom', icons.zoomIn, 'Zoom'],
  ['zoom-out', icons.zoomOut, 'Alejar'],
  ['full', icons.expand, 'Vista completa'],
];
$('[data-controls]').innerHTML = controls.map(([k, icon, label]) => `<button class="btn btn-ghost btn-sm" data-ctrl="${k}">${icon}${label}</button>`).join('');
$('[data-controls]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ctrl]');
  if (!btn) return;
  const k = btn.dataset.ctrl;
  if (k === 'rotate') { viewer.autoRotate = !viewer.autoRotate; btn.classList.toggle('active', viewer.autoRotate); }
  if (k === 'zoom') viewer.zoom(1.25);
  if (k === 'zoom-out') viewer.zoom(0.8);
  if (k === 'full') {
    const stage = $('[data-stage]');
    document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
  }
});

const views = [['iso', 'Vista 3/4'], ['front', 'Frente'], ['side', 'Lateral'], ['top', 'Superior']];
$('[data-thumbs]').innerHTML = views.map(([v, label], i) => `<button data-view="${v}" class="${i ? '' : 'active'}" aria-label="${label}" title="${label}"></button>`).join('');
$('[data-thumbs]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
  viewer.setView(btn.dataset.view);
});
for (const [v, label] of views) {
  const url = await renderSnapshot(template, state.data, { width: 200, height: 200, view: v });
  document.querySelector(`[data-view="${v}"]`).innerHTML = `<img src="${url}" alt="${escapeHTML(label)}">`;
}

$('[data-export]')?.addEventListener('click', () => openExportModal({
  template,
  getDesign: () => state,
  beforeLogin: () => setDraft(state),
  ensureSaved: async () => {
    if (state.designId) return state.designId;
    const thumbnail = await renderSnapshot(template, state.data, { width: 480, height: 360 });
    const saved = await api('/designs', { method: 'POST', body: { name: state.name, template_slug: template.slug, data: state.data, thumbnail } });
    state.designId = saved.id;
    setDraft(state);
    history.replaceState(null, '', `?design=${saved.id}`);
    $('[data-edit]').href = `/editor.html?design=${saved.id}`;
    return saved.id;
  },
}));
