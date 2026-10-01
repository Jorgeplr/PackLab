import { api } from './api.js';
import { icons } from './icons.js';
import { renderHeader, escapeHTML } from './layout.js';
import { renderSnapshot, defaultDesign } from './packaging.js';

renderHeader('plantillas');

const $ = (s) => document.querySelector(s);
$('[data-search-icon]').outerHTML = icons.search;

const params = new URLSearchParams(location.search);
let category = params.get('categoria') || '';
let query = '';
let templates = [];
const thumbs = new Map();

const categories = await api('/categories');
const chips = [{ slug: '', name: 'Todas' }, ...categories];

function renderChips() {
  $('[data-chips]').innerHTML = chips.map((c) => `
    <button class="chip ${c.slug === category ? 'active' : ''}" role="tab" aria-selected="${c.slug === category}" data-cat="${c.slug}">${escapeHTML(c.name)}</button>`).join('');
}

function renderGrid() {
  const list = templates.filter((t) => (!category || t.category_slug === category)
    && (!query || t.name.toLowerCase().includes(query.toLowerCase())));
  $('[data-grid]').innerHTML = list.length ? list.map((t) => `
    <article class="card tpl-card">
      <div class="tpl-thumb" data-thumb="${t.slug}">${thumbs.has(t.slug) ? `<img src="${thumbs.get(t.slug)}" alt="${escapeHTML(t.name)}">` : ''}</div>
      <div class="tpl-body">
        <h3>${escapeHTML(t.name)}</h3>
        <span class="tpl-meta">${escapeHTML(t.category)} · 3D · <span class="mono">${t.width}×${t.height}×${t.depth} cm</span></span>
        <div class="tpl-actions">
          <a class="btn btn-outline btn-sm" href="/vista-previa.html?template=${t.slug}">Ver plantilla</a>
          <a class="btn btn-primary btn-sm" href="/editor.html?template=${t.slug}">Personalizar</a>
        </div>
      </div>
    </article>`).join('')
    : '<p class="empty">No encontramos plantillas con ese criterio.</p>';
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

templates = await api('/templates');
renderChips();
renderGrid();

// Miniaturas 3D generadas en el navegador con la plantilla base
for (const t of templates) {
  thumbs.set(t.slug, await renderSnapshot(t, { ...defaultDesign(t), subtext: '' }, { width: 480, height: 360 }));
  const el = document.querySelector(`[data-thumb="${t.slug}"]`);
  if (el) el.innerHTML = `<img src="${thumbs.get(t.slug)}" alt="${escapeHTML(t.name)}">`;
}
