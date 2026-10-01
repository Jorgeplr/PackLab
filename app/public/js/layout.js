// Encabezado, pie y utilidades comunes de interfaz.
import { session } from './api.js';
import { icons } from './icons.js';

const links = [
  { href: '/', label: 'Inicio', key: 'inicio' },
  { href: '/plantillas.html', label: 'Plantillas', key: 'plantillas' },
  { href: '/#como-funciona', label: 'Cómo funciona', key: 'como' },
  { href: '/mis-disenos.html', label: 'Mis diseños', key: 'mis-disenos' },
];

export function brandHTML() {
  return '<a class="brand" href="/"><img src="/img/logo.svg" alt=""><span>PackLab</span></a>';
}

export function renderHeader(active) {
  const el = document.querySelector('[data-header]');
  if (!el) return;
  const user = session.user;
  const actions = user
    ? `<div class="user-chip"><span class="avatar">${escapeHTML(user.name.charAt(0).toUpperCase())}</span>
         <span class="name">${escapeHTML(user.name.split(' ')[0])}</span></div>
       <button class="btn btn-ghost btn-sm" data-logout>Salir</button>`
    : `<a class="btn btn-dark btn-sm" href="/login.html">Iniciar sesión</a>
       <a class="icon-btn" href="/login.html" aria-label="Cuenta">${icons.user}</a>`;

  el.innerHTML = `
    <header class="site-header">
      <div class="container">
        ${brandHTML()}
        <button class="icon-btn menu-toggle" aria-label="Menú" data-menu>${icons.menu}</button>
        <nav class="nav" data-nav>
          ${links.map((l) => `<a href="${l.href}" class="${l.key === active ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
        <div class="header-actions">${actions}</div>
      </div>
    </header>`;

  el.querySelector('[data-logout]')?.addEventListener('click', () => {
    session.clear();
    location.href = '/';
  });
  el.querySelector('[data-menu]').addEventListener('click', () => el.querySelector('[data-nav]').classList.toggle('open'));
}

export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}
