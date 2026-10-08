// Carrusel del hero: fundido entre diapositivas, autoplay pausable y accesible.
import { icons } from './icons.js';
import { reducedMotion } from './layout.js';

export function initSlider(root, { interval = 7000 } = {}) {
  if (!root) return;
  const slides = [...root.querySelectorAll('.slide')];
  const dots = root.querySelector('[data-dots]');
  const pauseBtn = root.querySelector('[data-pause]');
  let index = 0;
  let timer = null;
  let paused = reducedMotion;
  let hovering = false;

  dots.innerHTML = slides.map((_, i) => `<button type="button" class="slider-dot" aria-label="Ir a la diapositiva ${i + 1}"></button>`).join('');
  const dotBtns = [...dots.children];

  function show(i, { focus = false } = {}) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const on = n === index;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('inert', !on);
      s.setAttribute('aria-hidden', String(!on));
      if (on) s.querySelector('.slide-img')?.removeAttribute('loading');
    });
    dotBtns.forEach((d, n) => {
      if (n === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    if (focus) dotBtns[index].focus();
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (!paused && !hovering && !document.hidden) timer = setTimeout(() => show(index + 1), interval);
  }

  function setPaused(v) {
    paused = v;
    pauseBtn.innerHTML = paused ? icons.play : icons.pause;
    pauseBtn.setAttribute('aria-label', paused ? 'Reproducir carrusel' : 'Pausar carrusel');
    root.classList.toggle('is-paused', paused);
    schedule();
  }

  root.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  root.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  dots.addEventListener('click', (e) => {
    const i = dotBtns.indexOf(e.target.closest('.slider-dot'));
    if (i >= 0) show(i);
  });
  dots.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, { focus: true }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, { focus: true }); }
  });
  // Se detiene mientras el usuario lo mira o navega dentro de él
  root.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  root.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  root.addEventListener('focusin', () => { hovering = true; schedule(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { hovering = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);

  // Deslizar con el dedo en móviles
  let startX = null;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  setPaused(paused);
  show(0);
}
