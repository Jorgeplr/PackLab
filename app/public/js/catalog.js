import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, hydrateIcons, initReveal, escapeHTML } from './layout.js';
import { templateCardHTML, setThumb } from './cards.js';
import { renderSnapshot, defaultDesign } from './packaging.js';

renderHeader('tienda');
renderFooter();
hydrateIcons();

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
let category = params.get('categoria') || '';
let query = '';
const thumbs = new Map();

const [categories, templates] = await Promise.all([api('/categories'), api('/templates')]);
const chips = [{ slug: '', name: 'Todas' }, ...categories];

function renderChips() {
  $('[data-chips]').innerHTML = chips.map((c) => {
    const n = c.slug ? templates.filter((t) => t.category_slug === c.slug).length : templates.length;
    return `<button type="button" class="chip" aria-pressed="${c.slug === category}" data-cat="${c.slug}">${escapeHTML(c.name)} <span aria-hidden="true" style="opacity:.6">${n}</span></button>`;
  }).join('');
}

function renderGrid() {
  const q = query.toLowerCase();
  const list = templates.filter((t) => (!category || t.category_slug === category)
    && (!q || `${t.name} ${t.category} ${t.description || ''}`.toLowerCase().includes(q)));
  $('[data-count]').textContent = `${list.length} ${list.length === 1 ? 'plantilla' : 'plantillas'}`;
  $('[data-grid]').innerHTML = list.length
    ? list.map((t) => templateCardHTML(t, thumbs.get(t.slug))).join('')
    : `<div class="empty" style="grid-column:1/-1">${icons.emptyBox}
        <h3>No encontramos plantillas</h3>
        <p>Prueba con otra palabra o revisa todas las categorías.</p>
        <button class="btn btn-outline" type="button" data-reset>Ver todas las plantillas</button></div>`;
  initReveal($('[data-grid]'));
}

$('[data-chips]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  category = btn.dataset.cat;
  history.replaceState(null, '', category ? `?categoria=${category}` : location.pathname);
  renderChips();
  renderGrid();
});
$('[data-search]').addEventListener('input', (e) => { query = e.target.value.trim(); renderGrid(); });
$('[data-grid]').addEventListener('click', (e) => {
  if (!e.target.closest('[data-reset]')) return;
  category = '';
  query = '';
  $('[data-search]').value = '';
  history.replaceState(null, '', location.pathname);
  renderChips();
  renderGrid();
});

renderChips();
renderGrid();

// Miniaturas 3D generadas en el navegador con el diseño base
for (const t of templates) {
  thumbs.set(t.slug, await renderSnapshot(t, { ...defaultDesign(t), subtext: '' }, { width: 480, height: 360 }));
  setThumb(t, thumbs.get(t.slug));
}
