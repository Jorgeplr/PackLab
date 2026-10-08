// Encabezado, pie y utilidades comunes de interfaz.
import { session } from './api.js';
import { icons } from './icons.js';

const links = [
  { href: '/', label: 'Inicio', key: 'inicio' },
  { href: '/#nosotros', label: 'Nosotros', key: 'nosotros' },
  { href: '/#servicios', label: 'Servicio', key: 'servicio' },
  { href: '/plantillas.html', label: 'Tienda', key: 'tienda' },
  { href: '/planes.html', label: 'Planes', key: 'planes' },
  { href: '/blog.html', label: 'Blog', key: 'blog' },
];
const footerLinks = [...links, { href: '/#como-funciona', label: 'Cómo funciona' }, { href: '/mis-disenos.html', label: 'Mis diseños' }];

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function brandHTML() {
  return '<a class="brand" href="/" aria-label="PackLab, ir al inicio"><img class="brand-logo" src="/img/logo.png" alt="" width="115" height="40"><img class="brand-mark" src="/img/logo-mark.png" alt="" width="40" height="40"></a>';
}

export function renderHeader(active) {
  const el = document.querySelector('[data-header]');
  if (!el) return;
  const user = session.user;
  const actions = user
    ? `<a class="btn btn-ghost btn-sm my-designs ${active === 'mis-disenos' ? 'active' : ''}" href="/mis-disenos.html" ${active === 'mis-disenos' ? 'aria-current="page"' : ''}>${icons.box}<span>Mis diseños</span></a>
       <div class="user-chip"><span class="avatar" aria-hidden="true">${escapeHTML(user.name.charAt(0).toUpperCase())}</span>
         <span class="name">${escapeHTML(user.name.split(' ')[0])}</span></div>
       <button class="btn btn-ghost btn-sm" data-logout>Salir</button>`
    : `<a class="btn btn-dark btn-sm" href="/login.html">Iniciar sesión</a>
       <a class="icon-btn" href="/login.html" aria-label="Mi cuenta">${icons.user}</a>`;

  el.innerHTML = `
    <a class="skip-link" href="#main">Saltar al contenido</a>
    <header class="site-header">
      <div class="container">
        ${brandHTML()}
        <nav class="nav" data-nav aria-label="Principal">
          ${links.map((l) => `<a href="${l.href}" class="${l.key === active ? 'active' : ''}" ${l.key === active ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')}
        </nav>
        <button class="icon-btn menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="main-nav" data-menu>${icons.menu}</button>
        <div class="header-actions">${actions}</div>
      </div>
    </header>`;

  const nav = el.querySelector('[data-nav]');
  nav.id = 'main-nav';
  el.querySelector('[data-logout]')?.addEventListener('click', () => {
    session.clear();
    location.href = '/';
  });
  el.querySelector('[data-menu]').addEventListener('click', (e) => {
    const open = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });

  // En el inicio, el menú resalta la sección visible (Inicio, Nosotros, Servicio)
  if (active === 'inicio' && 'IntersectionObserver' in window) {
    const map = { nosotros: 'nosotros', servicios: 'servicio' };
    const setActive = (key) => nav.querySelectorAll('a').forEach((a) => {
      const on = a.getAttribute('href') === (key === 'inicio' ? '/' : `/#${Object.keys(map).find((k) => map[k] === key)}`);
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      const current = ['servicios', 'nosotros'].find((id) => seen.get(id));
      setActive(current ? map[current] : 'inicio');
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach((id) => { const sec = document.getElementById(id); if (sec) io.observe(sec); });
  }

  const header = el.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function renderFooter() {
  const el = document.querySelector('[data-footer]');
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            ${brandHTML()}
            <p class="tagline" style="margin-top:8px">Tu idea, tu empaque, tu estilo</p>
          </div>
          <nav aria-label="Pie de página">
            ${footerLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('')}
          </nav>
          <p style="margin:0;font-size:.88rem">Hecho para emprendimientos de Milagro, Guayas.</p>
        </div>
      </div>
    </footer>`;
}

/** Anima la entrada de los elementos .reveal cuando aparecen en pantalla. */
export function initReveal(root = document) {
  const items = [...root.querySelectorAll('.reveal:not(.in)')];
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((i) => i.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
    io.observe(el);
  });
}

export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
export function toast(message, { ok = true } = {}) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.innerHTML = `${ok ? icons.check : ''}<span>${escapeHTML(message)}</span>`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Estado de carga accesible para un botón. Devuelve una función para restaurarlo. */
export function busy(btn, label) {
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHTML(label)}`;
  return () => {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.innerHTML = html;
  };
}

/** Reemplaza <span data-i="nombre"> por el icono SVG correspondiente. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-i]').forEach((el) => {
    const svg = icons[el.dataset.i];
    if (svg) el.outerHTML = svg;
  });
}
