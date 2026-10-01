import { api, session } from './api.js';
import { icons } from './icons.js';
import { busy } from './layout.js';

const $ = (s) => document.querySelector(s);
const next = new URLSearchParams(location.search).get('next');
const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/plantillas.html';
let mode = new URLSearchParams(location.search).get('modo') === 'registro' ? 'register' : 'login';

if (session.token) location.replace(safeNext);

const pass = $('#password');
const toggle = $('[data-show-pass]');
toggle.innerHTML = icons.eye;
toggle.addEventListener('click', () => {
  const show = pass.type === 'password';
  pass.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

function setFieldError(name, message) {
  const input = document.getElementById(name);
  const err = document.querySelector(`[data-err="${name}"]`);
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  err.textContent = message || '';
}

function clearErrors() {
  ['name', 'email', 'password'].forEach((n) => setFieldError(n, ''));
  $('[data-error]').classList.add('hidden');
}

function render() {
  const reg = mode === 'register';
  $('[data-title]').textContent = reg ? 'Crea tu cuenta' : 'Bienvenido a PackLab';
  $('[data-sub]').textContent = reg
    ? 'Regístrate gratis y guarda tus diseños de empaque.'
    : 'Inicia sesión para acceder a todas las herramientas y comienza a diseñar tus empaques.';
  $('[data-name-field]').classList.toggle('hidden', !reg);
  $('[data-submit]').textContent = reg ? 'Crear cuenta' : 'Iniciar sesión';
  $('[data-switch]').textContent = reg ? 'Ya tengo una cuenta' : 'Crear una cuenta';
  pass.autocomplete = reg ? 'new-password' : 'current-password';
  document.title = `${reg ? 'Crear cuenta' : 'Iniciar sesión'} · PackLab`;
  clearErrors();
}

function validate(body) {
  let ok = true;
  if (mode === 'register' && !body.name.trim()) { setFieldError('name', 'Escribe tu nombre o el de tu emprendimiento.'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) { setFieldError('email', 'Escribe un correo válido, por ejemplo tu@correo.com.'); ok = false; }
  if (body.password.length < 6) { setFieldError('password', 'La contraseña debe tener al menos 6 caracteres.'); ok = false; }
  if (!ok) document.querySelector('[aria-invalid=true]')?.focus();
  return ok;
}

['name', 'email', 'password'].forEach((n) => document.getElementById(n).addEventListener('input', () => setFieldError(n, '')));

$('[data-switch]').addEventListener('click', () => {
  mode = mode === 'login' ? 'register' : 'login';
  render();
  (mode === 'register' ? $('#name') : $('#email')).focus();
});

$('[data-demo]').addEventListener('click', () => {
  mode = 'login';
  render();
  $('#email').value = 'demo@packlab.com';
  pass.value = 'packlab123';
  $('[data-form]').requestSubmit();
});

$('[data-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const body = Object.fromEntries(new FormData(e.target));
  body.name = body.name || '';
  if (!validate(body)) return;
  const restore = busy($('[data-submit]'), mode === 'register' ? 'Creando cuenta...' : 'Ingresando...');
  try {
    const result = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', body });
    session.save(result);
    location.href = safeNext;
  } catch (err) {
    restore();
    const box = $('[data-error]');
    box.textContent = err.message;
    box.classList.remove('hidden');
    box.focus();
  }
});

render();
