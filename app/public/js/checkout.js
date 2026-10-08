// Checkout del prototipo: valida la tarjeta en el navegador y solo envía marca y últimos 4 dígitos.
import { api, requireLogin } from './api.js';
import { icons } from './icons.js';
import { renderHeader, renderFooter, hydrateIcons, escapeHTML, formatDate, busy } from './layout.js';
import { money } from './money.js';

renderHeader('planes');
renderFooter();
hydrateIcons();
if (!requireLogin()) throw new Error('Requiere sesión');

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const slug = new URLSearchParams(location.search).get('plan');
const { plans } = await api('/plans');
const plan = plans.find((p) => p.slug === slug);
if (!plan) { location.replace('/planes.html'); throw new Error('Plan inválido'); }

const METHOD_NAMES = { card: 'Tarjeta', paypal: 'PayPal', mercadopago: 'Mercado Pago' };
const BRAND_NAMES = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', otra: 'Tarjeta' };
document.title = `Pagar ${plan.name} · PackLab`;
$('[data-pay]').textContent = `Pagar ${money(plan.price_cents)}`;
$('[data-summary-body]').innerHTML = `
  <div class="sum-plan">${icons.gift}<div><strong>${escapeHTML(plan.name)}</strong><span>Acceso por ${plan.duration_days} días</span></div></div>
  <ul class="sum-features">${plan.features.map((f) => `<li>${icons.check}${escapeHTML(f)}</li>`).join('')}</ul>
  <dl class="sum-total"><div><dt>Subtotal</dt><dd>${money(plan.price_cents)}</dd></div><div class="total"><dt>Total</dt><dd>${money(plan.price_cents)}</dd></div></dl>
  <a class="btn btn-ghost btn-sm" href="/planes.html">Cambiar de plan</a>`;

// ---------- Pestañas (patrón ARIA tabs) ----------
let method = 'card';
function selectTab(name, focus = false) {
  method = name;
  $$('[data-tab]').forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
  hideError();
}
$$('[data-tab]').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));
$('[role=tablist]').addEventListener('keydown', (e) => {
  const tabs = $$('[data-tab]').map((t) => t.dataset.tab);
  const i = tabs.indexOf(method);
  if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length], true); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
});

// ---------- Tarjeta ----------
const digits = (v) => v.replace(/\D/g, '');
function detectBrand(n) {
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return n ? 'otra' : '';
}
function luhn(n) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return n.length >= 13 && sum % 10 === 0;
}
const field = (k) => $(`[data-cc="${k}"]`);
function setErr(k, msg) {
  field(k).setAttribute('aria-invalid', msg ? 'true' : 'false');
  $(`[data-err="${k}"]`).textContent = msg || '';
}

field('number').addEventListener('input', (e) => {
  const n = digits(e.target.value).slice(0, 19);
  const brand = detectBrand(n);
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3];
  let out = '';
  let pos = 0;
  for (const g of groups) { if (pos >= n.length) break; out += (out ? ' ' : '') + n.slice(pos, pos + g); pos += g; }
  e.target.value = out;
  $('[data-brand]').textContent = brand && brand !== 'otra' ? BRAND_NAMES[brand] : '';
  field('cvc').maxLength = brand === 'amex' ? 4 : 3;
  setErr('number', '');
});
field('exp').addEventListener('input', (e) => {
  const d = digits(e.target.value).slice(0, 4);
  e.target.value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  setErr('exp', '');
});
field('cvc').addEventListener('input', (e) => { e.target.value = digits(e.target.value); setErr('cvc', ''); });
field('name').addEventListener('input', () => setErr('name', ''));

function validateCard() {
  const n = digits(field('number').value);
  const brand = detectBrand(n);
  const [mm, yy] = digits(field('exp').value).match(/^(\d{2})(\d{2})$/)?.slice(1) || [];
  const now = new Date();
  const month = Number(mm);
  const year = 2000 + Number(yy);
  const errors = {};
  if (!luhn(n)) errors.number = 'Revisa el número de la tarjeta.';
  if (field('name').value.trim().length < 3) errors.name = 'Escribe el nombre como aparece en la tarjeta.';
  if (!mm || month < 1 || month > 12) errors.exp = 'Usa el formato MM / AA.';
  else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.exp = 'La tarjeta está vencida.';
  if (digits(field('cvc').value).length !== (brand === 'amex' ? 4 : 3)) errors.cvc = brand === 'amex' ? 'El CVC tiene 4 dígitos.' : 'El CVC tiene 3 dígitos.';
  ['number', 'name', 'exp', 'cvc'].forEach((k) => setErr(k, errors[k]));
  const first = ['number', 'name', 'exp', 'cvc'].find((k) => errors[k]);
  if (first) { field(first).focus(); return null; }
  // Solo esto sale del navegador: nunca el número completo ni el CVC
  return { brand, last4: n.slice(-4), expMonth: month, expYear: year };
}

// ---------- Pago ----------
function hideError() { $('[data-pay-error]').classList.add('hidden'); }
function showError(msg) {
  const box = $('[data-pay-error]');
  box.textContent = msg;
  box.classList.remove('hidden');
  window.scrollTo({ top: 0 });
  box.focus({ preventScroll: true });
}

async function pay(payload, btn, label) {
  hideError();
  const restore = busy(btn, label);
  try {
    const receipt = await api('/billing/checkout', { method: 'POST', body: { plan: plan.slug, ...payload } });
    showSuccess(receipt);
  } catch (err) {
    restore();
    showError(err.message);
  }
}

$('[data-panel=card]').addEventListener('submit', (e) => {
  e.preventDefault();
  const card = validateCard();
  if (card) pay({ method: 'card', card }, $('[data-pay]'), 'Procesando pago…');
});
$$('[data-wallet]').forEach((b) => b.addEventListener('click', async () => {
  const name = METHOD_NAMES[b.dataset.wallet];
  const restore = busy(b, `Conectando con ${name}…`);
  await new Promise((r) => setTimeout(r, 1200)); // simula la ventana de la billetera
  restore();
  pay({ method: b.dataset.wallet }, b, 'Confirmando pago…');
}));

function showSuccess(r) {
  $('[data-checkout]').classList.add('hidden');
  document.querySelector('.test-banner').classList.add('hidden');
  const steps = $$('[data-steps] li');
  steps.forEach((li, i) => { li.classList.toggle('done', i < 2); li.classList.toggle('on', i === 2); });
  const how = r.method === 'card' ? `${BRAND_NAMES[r.card_brand] || 'Tarjeta'} •••• ${r.card_last4}` : METHOD_NAMES[r.method];
  const quota = r.status.unlimited ? 'Exportaciones ilimitadas' : `${r.status.remaining} exportaciones disponibles`;
  const box = $('[data-success]');
  box.innerHTML = `
    <div class="check">${icons.check}</div>
    <h1 id="ok-title">¡Pago exitoso!</h1>
    <p class="muted">Tu <strong>${escapeHTML(r.plan.name)}</strong> ha sido activado. Ahora puedes personalizar y exportar tus empaques en 3D.</p>
    <dl class="receipt">
      <div><dt>Referencia</dt><dd class="mono">${escapeHTML(r.reference)}</dd></div>
      <div><dt>Monto</dt><dd>${money(r.amount_cents)}</dd></div>
      <div><dt>Método</dt><dd>${escapeHTML(how)}</dd></div>
      <div><dt>Vigente hasta</dt><dd>${formatDate(r.ends_at)}</dd></div>
      <div><dt>Tu cuota</dt><dd>${quota}</dd></div>
    </dl>
    <div class="hero-actions" style="justify-content:center">
      <a class="btn btn-primary btn-lg" href="/plantillas.html">Ir al editor</a>
      <a class="btn btn-outline btn-lg" href="/mis-disenos.html">Mis diseños</a>
    </div>
    <p class="muted" style="font-size:.84rem;margin-top:var(--s-4)">Prototipo: no se realizó ningún cobro real.</p>`;
  box.classList.remove('hidden');
  box.focus();
}
