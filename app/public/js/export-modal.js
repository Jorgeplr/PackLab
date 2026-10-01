// Modal "¡Tu diseño está listo!" con las opciones de exportación.
import { api, session, goToLogin } from './api.js';
import { icons } from './icons.js';
import { escapeHTML } from './layout.js';
import { renderFace, renderDieline, renderSnapshot, downloadCanvas, downloadDataURL } from './packaging.js';

const FORMATS = [
  { key: 'png-plano', label: 'Plano troquelado (PNG)', hint: 'Plano desplegado con líneas de corte y doblez, listo para la imprenta.' },
  { key: 'png-cara', label: 'Cara frontal (PNG)', hint: 'Solo el arte principal en alta resolución.' },
  { key: 'png-3d', label: 'Vista 3D (PNG)', hint: 'Imagen del empaque armado para redes o catálogo.' },
];

function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diseno';
}

/**
 * @param {object} opts
 * @param {object} opts.template plantilla
 * @param {() => {name: string, data: object}} opts.getDesign diseño actual
 * @param {() => Promise<number>} opts.ensureSaved guarda si hace falta y devuelve el id
 * @param {() => void} [opts.beforeLogin] se llama antes de redirigir al login
 */
export async function openExportModal({ template, getDesign, ensureSaved, beforeLogin }) {
  if (!session.token) {
    beforeLogin?.();
    goToLogin();
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <button class="icon-btn close" aria-label="Cerrar" data-close>${icons.close}</button>
      <div class="check">${icons.check}</div>
      <h2 id="export-title">¡Tu diseño está listo!</h2>
      <p class="muted">Puedes exportar tu diseño y llevarlo a la imprenta que prefieras.</p>
      <span class="badge badge-amber" data-quota>${icons.gift} Diseño gratuito</span>
      <div class="formats">
        ${FORMATS.map((f, i) => `
          <label class="format"><input type="radio" name="format" value="${f.key}" ${i === 0 ? 'checked' : ''}>
            <span>${f.label}<small>${f.hint}</small></span></label>`).join('')}
      </div>
      <div class="alert alert-error hidden" data-error></div>
      <button class="btn btn-primary btn-lg btn-block" data-export>${icons.download} Exportar diseño</button>
      <p class="muted" style="font-size:.85rem;margin:14px 0 0">También puedes guardarlo en <a href="/mis-disenos.html">Mis diseños</a>, para editarlo más tarde.</p>
    </div>`;
  document.body.append(backdrop);

  const $ = (sel) => backdrop.querySelector(sel);
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  $('[data-close]').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  const showQuota = (q) => {
    $('[data-quota]').innerHTML = `${icons.gift} Diseño gratuito · ${q.remaining} de ${q.limit} exportaciones disponibles`;
  };
  api('/designs/exports/status').then(showQuota).catch(() => {});

  $('[data-export]').addEventListener('click', async () => {
    const btn = $('[data-export]');
    const error = $('[data-error]');
    const format = backdrop.querySelector('input[name=format]:checked').value;
    error.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Preparando archivo...';
    try {
      const id = await ensureSaved();
      const quota = await api(`/designs/${id}/exports`, { method: 'POST', body: { format } });
      showQuota(quota);
      const { name, data } = getDesign();
      const file = `packlab-${slugify(name)}-${format.replace('png-', '')}.png`;
      if (format === 'png-plano') await downloadCanvas(await renderDieline(template, data), file);
      if (format === 'png-cara') await downloadCanvas(await renderFace(data, template.width, template.height, { px: 2048 }), file);
      if (format === 'png-3d') downloadDataURL(await renderSnapshot(template, data, { width: 1600, height: 1200 }), file);
      btn.innerHTML = `${icons.check} Descargado`;
      setTimeout(() => { btn.innerHTML = `${icons.download} Exportar otro formato`; btn.disabled = false; }, 1500);
    } catch (err) {
      error.innerHTML = escapeHTML(err.status === 402 ? `${err.message} El plan Pro estará disponible pronto.` : err.message);
      error.classList.remove('hidden');
      btn.innerHTML = `${icons.download} Exportar diseño`;
      btn.disabled = false;
    }
  });
}
