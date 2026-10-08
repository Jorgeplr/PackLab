import { api, requireLogin } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, hydrateIcons, initReveal, escapeHTML, formatDate, toast } from './layout.js';
import { clearDraft } from './store.js';
import { openExportModal } from './export-modal.js';

renderHeader('mis-disenos');
renderFooter();
hydrateIcons();
if (!requireLogin()) throw new Error('Requiere sesión');

const grid = document.querySelector('[data-grid]');
const count = document.querySelector('[data-count]');
let designs = [];

grid.innerHTML = Array.from({ length: 4 }, () => `
  <div class="card tpl-card" aria-hidden="true"><div class="tpl-thumb skeleton"></div>
  <div class="tpl-body"><div class="skeleton" style="height:18px;width:70%;border-radius:6px"></div>
  <div class="skeleton" style="height:12px;width:45%;border-radius:6px;margin-top:8px"></div></div></div>`).join('');

function render() {
  count.textContent = designs.length ? `${designs.length} ${designs.length === 1 ? 'diseño guardado' : 'diseños guardados'}` : '';
  if (!designs.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icons.emptyBox}
      <h3>Aún no tienes diseños guardados</h3>
      <p>Elige una plantilla, personalízala y guárdala para verla aquí.</p>
      <a class="btn btn-primary" href="/plantillas.html">Crear mi primer empaque</a></div>`;
    return;
  }
  grid.innerHTML = designs.map((d) => `
    <article class="card tpl-card design-card reveal" data-id="${d.id}">
      <div class="tpl-thumb">
        <span class="tpl-tag">${escapeHTML(d.template_name)}</span>
        ${d.thumbnail ? `<img src="${d.thumbnail}" alt="Vista 3D de ${escapeHTML(d.name)}">` : icons.box}
        <button type="button" class="icon-btn menu-btn" data-menu aria-label="Más opciones para ${escapeHTML(d.name)}" aria-haspopup="menu" aria-expanded="false">${icons.dots}</button>
      </div>
      <div class="tpl-body">
        <h3>${escapeHTML(d.name)}</h3>
        <span class="tpl-meta">${icons.clock.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} Editado el ${formatDate(d.updated_at)}</span>
        <div class="tpl-actions">
          <a class="btn btn-outline btn-sm" href="/editor.html?design=${d.id}">${icons.edit}Editar</a>
          <button type="button" class="btn btn-primary btn-sm" data-export>${icons.download}Exportar</button>
        </div>
      </div>
    </article>`).join('');
  initReveal(grid);
}

function closeMenus() {
  document.querySelectorAll('.dropdown').forEach((m) => m.remove());
  document.querySelectorAll('[data-menu][aria-expanded=true]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

grid.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-id]');
  if (!card) return;
  const design = designs.find((d) => String(d.id) === card.dataset.id);

  const menuBtn = e.target.closest('[data-menu]');
  if (menuBtn) {
    e.stopPropagation();
    const open = card.querySelector('.dropdown');
    closeMenus();
    if (open) return;
    menuBtn.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.className = 'dropdown';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <button role="menuitem" data-act="preview">${icons.eye}Vista previa</button>
      <button role="menuitem" data-act="rename">${icons.edit}Cambiar nombre</button>
      <button role="menuitem" data-act="delete" class="danger">${icons.trash}Eliminar</button>`;
    card.querySelector('.tpl-thumb').append(menu);
    menu.querySelector('button').focus();
    menu.addEventListener('keydown', (ev) => {
      const items = [...menu.querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (ev.key === 'Escape') { closeMenus(); menuBtn.focus(); }
    });
    return;
  }

  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'preview') location.href = `/vista-previa.html?design=${design.id}`;
  if (act === 'rename') {
    const name = prompt('Nuevo nombre del diseño', design.name)?.trim();
    if (name) {
      Object.assign(design, await api(`/designs/${design.id}`, { method: 'PUT', body: { name } }));
      render();
      toast('Nombre actualizado');
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

const [list, plan] = await Promise.all([api('/designs'), api('/billing/me').catch(() => null)]);
designs = list;
if (plan) {
  const pct = plan.unlimited ? 0 : Math.min(100, (plan.used / Math.max(1, plan.limit)) * 100);
  const text = plan.unlimited ? 'Exportaciones ilimitadas' : `${plan.used} de ${plan.limit} exportaciones usadas`;
  const bar = document.createElement('div');
  bar.className = 'plan-bar';
  bar.innerHTML = `<span><strong>${escapeHTML(plan.plan.name)}</strong> · ${text}${plan.plan.ends_at ? ` · vence el ${formatDate(plan.plan.ends_at)}` : ''}</span>
    ${plan.unlimited ? '' : `<span class="meter" role="img" aria-label="${text}"><span style="width:${pct}%"></span></span>`}
    <a class="btn btn-outline btn-sm" href="/planes.html">${plan.plan.slug === 'gratis' ? 'Mejorar plan' : 'Ver planes'}</a>`;
  count.before(bar);
}
render();
