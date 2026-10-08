import { api, session } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, hydrateIcons, escapeHTML, formatDate } from './layout.js';
import { money } from './money.js';

renderHeader('planes');
renderFooter();
hydrateIcons();

const $ = (s) => document.querySelector(s);
const [{ plans, free_exports: freeExports }, status] = await Promise.all([
  api('/plans'),
  session.token ? api('/billing/me').catch(() => null) : null,
]);
const current = status?.plan?.slug || 'gratis';

const gift = (n = 1) => `<span class="plan-ico" aria-hidden="true">${Array.from({ length: n }, () => icons.gift).join('')}</span>`;

const free = {
  slug: 'gratis', name: 'Plan Gratis', price_cents: 0, popular: false,
  features: [`${freeExports} exportaciones en total`, 'Vista 3D y plano troquelado', 'Diseños guardados ilimitados'],
};

function card(p, i) {
  const isCurrent = p.slug === current;
  const href = p.slug === 'gratis' ? '/plantillas.html' : `/checkout.html?plan=${p.slug}`;
  const label = isCurrent ? 'Tu plan actual' : p.slug === 'gratis' ? 'Empezar gratis' : 'Seleccionar';
  return `
    <article class="plan-card ${p.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}">
      ${p.popular ? '<span class="plan-flag">Más popular</span>' : ''}
      ${gift(Math.min(3, i + 1))}
      <h2>${escapeHTML(p.name)}</h2>
      <p class="plan-price">${p.price_cents ? money(p.price_cents) : 'Gratis'}${p.price_cents ? '<small> / 30 días</small>' : ''}</p>
      <ul>${p.features.map((f) => `<li>${icons.check}${escapeHTML(f)}</li>`).join('')}</ul>
      ${isCurrent
    ? `<span class="btn btn-outline btn-block" aria-disabled="true">${label}</span>`
    : `<a class="btn ${p.popular ? 'btn-primary' : 'btn-outline'} btn-block" href="${href}" aria-label="${label}: ${escapeHTML(p.name)}">${label}</a>`}
    </article>`;
}

$('[data-plans]').innerHTML = [free, ...plans].map(card).join('');
$('[data-plans]').removeAttribute('aria-busy');

if (status) {
  const box = $('[data-current]');
  const usage = status.unlimited ? 'Exportaciones ilimitadas' : `${status.used} de ${status.limit} exportaciones usadas`;
  const until = status.plan.ends_at ? ` · vence el ${formatDate(status.plan.ends_at)}` : '';
  box.innerHTML = `${icons.shield}<span>Tu plan actual: <strong>${escapeHTML(status.plan.name)}</strong> · ${usage}${until}</span>`;
  box.classList.remove('hidden');
}
