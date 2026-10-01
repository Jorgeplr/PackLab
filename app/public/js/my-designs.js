import { api, requireLogin } from './api.js';
import { icons } from './icons.js';
import { renderHeader, escapeHTML, formatDate, toast } from './layout.js';
import { clearDraft } from './store.js';
import { openExportModal } from './export-modal.js';

renderHeader('mis-disenos');
if (!requireLogin()) throw new Error('Requiere sesión');

const grid = document.querySelector('[data-grid]');
let designs = [];

function render() {
  if (!designs.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <p>Aún no tienes diseños guardados.</p>
      <a class="btn btn-primary" href="/plantillas.html">Crear mi primer empaque</a></div>`;
    return;
  }
  grid.innerHTML = designs.map((d) => `
    <article class="card tpl-card design-card" data-id="${d.id}">
      <div class="tpl-thumb">
        ${d.thumbnail ? `<img src="${d.thumbnail}" alt="${escapeHTML(d.name)}">` : icons.box}
        <button class="icon-btn menu-btn" data-menu aria-label="Más opciones">${icons.dots}</button>
      </div>
      <div class="tpl-body">
        <h3>${escapeHTML(d.name)}</h3>
        <span class="tpl-meta">${escapeHTML(d.template_name)} · ${formatDate(d.updated_at)}</span>
        <div class="tpl-actions">
          <a class="btn btn-outline btn-sm" href="/editor.html?design=${d.id}">Editar</a>
          <button class="btn btn-primary btn-sm" data-export>Exportar</button>
        </div>
      </div>
    </article>`).join('');
}

function closeMenus() { document.querySelectorAll('.dropdown').forEach((m) => m.remove()); }

grid.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-id]');
  if (!card) return;
  const design = designs.find((d) => String(d.id) === card.dataset.id);

  if (e.target.closest('[data-menu]')) {
    e.stopPropagation();
    const open = card.querySelector('.dropdown');
    closeMenus();
    if (open) return;
    const menu = document.createElement('div');
    menu.className = 'dropdown';
    menu.innerHTML = `<button data-act="preview">Vista previa</button><button data-act="rename">Cambiar nombre</button><button data-act="delete" class="danger">Eliminar</button>`;
    card.querySelector('.tpl-thumb').append(menu);
    return;
  }

  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'preview') location.href = `/vista-previa.html?design=${design.id}`;
  if (act === 'rename') {
    const name = prompt('Nuevo nombre del diseño', design.name)?.trim();
    if (name) {
      Object.assign(design, await api(`/designs/${design.id}`, { method: 'PUT', body: { name } }));
      render();
    }
  }
  if (act === 'delete' && confirm(`¿Eliminar "${design.name}"? Esta acción no se puede deshacer.`)) {
    await api(`/designs/${design.id}`, { method: 'DELETE' });
    designs = designs.filter((d) => d !== design);
    clearDraft();
    render();
    toast('Diseño eliminado');
  }

  if (e.target.closest('[data-export]')) {
    const template = await api(`/templates/${design.template_slug}`);
    openExportModal({ template, getDesign: () => design, ensureSaved: async () => design.id });
  }
});
document.addEventListener('click', closeMenus);

designs = await api('/designs');
render();
