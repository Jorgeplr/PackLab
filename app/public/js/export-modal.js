// Modal "¡Tu diseño está listo!" con las opciones de exportación.
import { api, session, goToLogin } from './api.js';
import { icons } from './icons.js';
import { escapeHTML, busy } from './layout.js';
import { renderFrontFace, renderDieline, renderSnapshot, downloadCanvas, downloadDataURL } from './packaging.js';

const FORMATS = [
  { key: 'png-plano', icon: 'dieline', label: 'Plano troquelado (PNG)', hint: 'Plano desplegado con líneas de corte y doblez, listo para la imprenta.' },
  { key: 'png-cara', icon: 'image', label: 'Cara frontal (PNG)', hint: 'Solo el arte principal en alta resolución.' },
  { key: 'png-3d', icon: 'box', label: 'Vista 3D (PNG)', hint: 'Imagen del empaque armado para redes o catálogo.' },
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
      <div class="formats" role="radiogroup" aria-label="Formato de exportación">
        ${FORMATS.map((f, i) => `
          <label class="format"><input type="radio" name="format" value="${f.key}" ${i === 0 ? 'checked' : ''}>
            <span>${f.label}<small>${f.hint}</small></span><span class="f-ico" aria-hidden="true">${icons[f.icon]}</span></label>`).join('')}
      </div>
      <div class="alert alert-error hidden" role="alert" data-error></div>
      <button class="btn btn-primary btn-lg btn-block" data-export>${icons.download} Exportar diseño</button>
      <p class="muted" style="font-size:.88rem;margin:16px 0 0">También puedes guardarlo en <a href="/mis-disenos.html">Mis diseños</a>, para editarlo más tarde.</p>
    </div>`;
  document.body.append(backdrop);

  const $ = (sel) => backdrop.querySelector(sel);
  const opener = document.activeElement;
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    opener?.focus?.();
  };
  // Escape cierra; Tab queda atrapado dentro del modal
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const items = [...backdrop.querySelectorAll('button, a[href], input:checked')].filter((el) => !el.disabled);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  $('[data-close]').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('input:checked').focus();

  const showQuota = (q) => {
    $('[data-quota]').innerHTML = `${icons.gift} Diseño gratuito · ${q.remaining} de ${q.limit} exportaciones disponibles`;
  };
  api('/designs/exports/status').then(showQuota).catch(() => {});

  $('[data-export]').addEventListener('click', async () => {
    const btn = $('[data-export]');
    const error = $('[data-error]');
    const format = backdrop.querySelector('input[name=format]:checked').value;
    error.classList.add('hidden');
    const restore = busy(btn, 'Preparando archivo…');
    try {
      const id = await ensureSaved();
      const quota = await api(`/designs/${id}/exports`, { method: 'POST', body: { format } });
      showQuota(quota);
      const { name, data } = getDesign();
      const file = `packlab-${slugify(name)}-${format.replace('png-', '')}.png`;
      if (format === 'png-plano') await downloadCanvas(await renderDieline(template, data), file);
      if (format === 'png-cara') await downloadCanvas(await renderFrontFace(template, data, { px: 2048 }), file);
      if (format === 'png-3d') downloadDataURL(await renderSnapshot(template, data, { width: 1600, height: 1200 }), file);
      restore();
      btn.innerHTML = `${icons.check} Descargado`;
      setTimeout(() => { btn.innerHTML = `${icons.download} Exportar otro formato`; }, 1500);
    } catch (err) {
      error.innerHTML = escapeHTML(err.status === 402 ? `${err.message} El plan Pro estará disponible pronto.` : err.message);
      error.classList.remove('hidden');
      restore();
    }
  });
}
