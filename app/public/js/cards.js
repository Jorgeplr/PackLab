// Tarjeta de plantilla compartida por el inicio y el catálogo.
import { escapeHTML } from './layout.js';

export function templateCardHTML(t, thumb) {
  return `
    <article class="card tpl-card reveal">
      <div class="tpl-thumb ${thumb ? '' : 'skeleton'}" data-thumb="${t.slug}">
        <span class="tpl-tag">${escapeHTML(t.category)}</span>
        ${thumb ? `<img src="${thumb}" alt="Plantilla ${escapeHTML(t.name)} en 3D">` : ''}
      </div>
      <div class="tpl-body">
        <h3>${escapeHTML(t.name)}</h3>
        <span class="tpl-meta">3D · <span class="mono">${t.width} × ${t.height} × ${t.depth} cm</span></span>
        ${t.description ? `<p class="tpl-desc">${escapeHTML(t.description)}</p>` : ''}
        <div class="tpl-actions">
          <a class="btn btn-outline btn-sm" href="/vista-previa.html?template=${t.slug}" aria-label="Ver plantilla ${escapeHTML(t.name)}">Ver plantilla</a>
          <a class="btn btn-primary btn-sm" href="/editor.html?template=${t.slug}" aria-label="Personalizar ${escapeHTML(t.name)}">Personalizar</a>
        </div>
      </div>
    </article>`;
}

/** Inserta la miniatura cuando ya está generada. */
export function setThumb(t, url) {
  const el = document.querySelector(`[data-thumb="${t.slug}"]`);
  if (!el) return;
  el.classList.remove('skeleton');
  el.querySelector('img')?.remove();
  el.insertAdjacentHTML('beforeend', `<img src="${url}" alt="Plantilla ${escapeHTML(t.name)} en 3D">`);
}
