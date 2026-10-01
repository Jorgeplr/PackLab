import { api, session } from './api.js';
import { icons } from './icons.js';

const $ = (s) => document.querySelector(s);
const next = new URLSearchParams(location.search).get('next');
const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/plantillas.html';
let mode = new URLSearchParams(location.search).get('modo') === 'registro' ? 'register' : 'login';

if (session.token) location.replace(safeNext);

$('[data-show-pass]').innerHTML = icons.eye;
$('[data-show-pass]').addEventListener('click', () => {
  const input = $('#password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

function render() {
  const reg = mode === 'register';
  $('[data-title]').textContent = reg ? 'Crea tu cuenta' : 'Bienvenido a PackLab';
  $('[data-sub]').textContent = reg
    ? 'Regístrate gratis y guarda tus diseños de empaque.'
    : 'Inicia sesión para acceder a todas las herramientas y comienza a diseñar tus empaques.';
  $('[data-name-field]').classList.toggle('hidden', !reg);
  $('[data-submit]').textContent = reg ? 'Crear cuenta' : 'Iniciar sesión';
  $('[data-switch]').textContent = reg ? 'Ya tengo una cuenta' : 'Crear una cuenta';
  $('#password').autocomplete = reg ? 'new-password' : 'current-password';
  $('[data-error]').classList.add('hidden');
}

$('[data-switch]').addEventListener('click', () => {
  mode = mode === 'login' ? 'register' : 'login';
  render();
});

$('[data-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = Object.fromEntries(form);
  const btn = $('[data-submit]');
  btn.disabled = true;
  try {
    const result = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', body });
    session.save(result);
    location.href = safeNext;
  } catch (err) {
    $('[data-error]').textContent = err.message;
    $('[data-error]').classList.remove('hidden');
    btn.disabled = false;
  }
});

render();
