import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, escapeHTML } from './layout.js';
import { setDraft, loadWorkingDesign } from './store.js';
import { openExportModal } from './export-modal.js';
import { PackageViewer, renderSnapshot, defaultDesign, effectiveTemplate } from './packaging.js';

renderHeader('plantillas');
renderFooter();
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
$('[data-ready-ico]').innerHTML = templateOnly ? icons.box : icons.check;
const dims = effectiveTemplate(template, state.data);
$('[data-subtitle]').innerHTML = `${escapeHTML(template.name)} · <span class="mono">${dims.width} × ${dims.height} × ${dims.depth} cm</span>`;
$('[data-back]').href = templateOnly ? '/plantillas.html' : editUrl;
$('[data-edit]').href = editUrl;
if (templateOnly) {
  $('[data-title]').textContent = template.name;
  $('[data-ready-title]').textContent = `Plantilla de ${template.category.toLowerCase()}`;
  $('[data-ready-sub]').textContent = template.description || '';
  $('[data-edit]').textContent = 'Personalizar';
  $('[data-edit]').className = 'btn btn-primary';
  $('[data-export]').remove();
} else {
  $('[data-title]').textContent = state.name;
}
document.title = `${state.name} · Vista previa · PackLab`;

const viewer = new PackageViewer($('[data-stage]'), { label: `Vista 3D de ${state.name}` });
await viewer.setPackage(template, state.data);

const controls = [
  ['rotate', icons.rotate, 'Rotar automáticamente'],
  ['zoom', icons.zoomIn, 'Acercar'],
  ['zoom-out', icons.zoomOut, 'Alejar'],
  ['full', icons.expand, 'Vista completa'],
];
$('[data-controls]').innerHTML = controls.map(([k, icon, label]) => `<button type="button" class="icon-btn" data-ctrl="${k}" aria-label="${label}" title="${label}" ${k === 'rotate' ? 'aria-pressed="false"' : ''}>${icon}</button>`).join('');
$('[data-controls]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ctrl]');
  if (!btn) return;
  const k = btn.dataset.ctrl;
  if (k === 'rotate') {
    viewer.autoRotate = !viewer.autoRotate;
    btn.classList.toggle('active', viewer.autoRotate);
    btn.setAttribute('aria-pressed', String(viewer.autoRotate));
  }
  if (k === 'zoom') viewer.zoom(1.25);
  if (k === 'zoom-out') viewer.zoom(0.8);
  if (k === 'full') {
    const stage = $('[data-stage]');
    document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
  }
});

const views = [['iso', 'Vista 3/4'], ['front', 'Frente'], ['side', 'Lateral'], ['top', 'Superior']];
$('[data-thumbs]').innerHTML = views.map(([v, label], i) => `<button type="button" data-view="${v}" aria-pressed="${!i}" aria-label="${label}" title="${label}" class="skeleton"><span>${label}</span></button>`).join('');
$('[data-thumbs]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  viewer.setView(btn.dataset.view);
});
for (const [v] of views) {
  const url = await renderSnapshot(template, state.data, { width: 200, height: 200, view: v });
  const b = document.querySelector(`[data-view="${v}"]`);
  b.classList.remove('skeleton');
  b.insertAdjacentHTML('afterbegin', `<img src="${url}" alt="">`);
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
