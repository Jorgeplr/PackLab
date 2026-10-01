// Tutorial animado de la página de inicio: simula el uso real de PackLab
// (elegir plantilla → personalizar → ver en 3D → exportar) con un cursor y paneles.
import { icons } from './icons.js';
import { reducedMotion } from './layout.js';
import { PackageViewer, renderSnapshot, renderDieline, defaultDesign, graphicSVG } from './packaging.js';

const DURATION = 24;
const CAPTIONS = ['1 · Elige tu plantilla', '2 · Personaliza', '3 · Visualiza en 3D', '4 · Exporta e imprime'];
const STEP_STARTS = [0, 6, 13, 19];

export function initTutorial(root, stepsList, bySlug) {
  const base = bySlug['caja-rectangular'];
  if (!base) return;
  const cards = ['bolsa-papel', 'caja-rectangular', 'frasco', 'caja-regalo'].map((s) => bySlug[s]).filter(Boolean);
  const steps = [...stepsList.querySelectorAll('li')];
  const q = (s) => root.querySelector(s);

  // ---------- Capas de la animación ----------
  const layer = document.createElement('div');
  layer.className = 'tut';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="tut-cards">
      ${cards.map((t) => `<div class="tut-card" data-card="${t.slug}"><div class="tut-card-img"></div><span>${t.name}</span></div>`).join('')}
    </div>
    <div class="tut-panel">
      <div class="tut-row"><small>Color</small><div class="tut-sw">
        ${['#DDBB99', '#F3EFE8', '#4A7C59', '#D96B43'].map((c) => `<i data-sw="${c}" style="background:${c}"></i>`).join('')}
      </div></div>
      <div class="tut-row"><small>Texto</small><div class="tut-input"><span data-typed></span><b class="caret"></b></div></div>
      <div class="tut-row"><small>Gráficos</small><div class="tut-icons">
        ${['leaf', 'star', 'flower', 'heart'].map((g) => `<i data-gr="${g}">${graphicSVG(g)}</i>`).join('')}
      </div></div>
      <div class="tut-row"><small>Fondo</small><div class="tut-chips"><i data-pt="none">Liso</i><i data-pt="dots">Puntos</i><i data-pt="stripes">Rayas</i></div></div>
    </div>
    <div class="tut-badge" data-badge></div>
    <div class="tut-export">
      <div class="tut-dieline"><img alt="" data-dieline></div>
      <div class="tut-export-bar"><span>${icons.dieline} Plano troquelado · PNG</span><i class="tut-btn" data-dl>${icons.download} Descargar</i></div>
    </div>
    <div class="tut-toast" data-toast>${icons.check} packlab-plano.png descargado</div>
    <div class="tut-cursor" data-cursor><svg viewBox="0 0 24 24"><path d="M4 2l16 10.5-7 1.5 4 7.5-3 1.5-4-7.5L4 20z" fill="#1F2A33" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`;
  root.append(layer);
  const L = (s) => layer.querySelector(s);

  const viewer = new PackageViewer(root, { label: 'Tutorial animado de PackLab', keyboard: false });
  viewer.controls.enableZoom = false;
  viewer.controls.autoRotateSpeed = 0.9;
  const canvas = root.querySelector('canvas.three');

  // Miniaturas de las tarjetas y plano final (se generan una vez)
  cards.forEach(async (t) => {
    const url = await renderSnapshot(t, { ...defaultDesign(t), subtext: '' }, { width: 240, height: 180 });
    layer.querySelector(`[data-card="${t.slug}"] .tut-card-img`).style.backgroundImage = `url(${url})`;
  });

  // ---------- Estado del diseño ----------
  const plain = () => ({ ...defaultDesign(base), text: '', subtext: '', graphic: null });
  let design = plain();
  let pop = null;
  const render = async ({ animate = false } = {}) => {
    await viewer.setPackage(base, design);
    if (animate && viewer.model) pop = { start: performance.now(), model: viewer.model };
  };
  const set = (patch) => { design = { ...design, ...patch }; render(); };

  // ---------- Cursor ----------
  const cursor = L('[data-cursor]');
  function moveTo(el, dx = 0.5, dy = 0.5) {
    const r = el.getBoundingClientRect();
    const p = root.getBoundingClientRect();
    cursor.style.transform = `translate(${r.left - p.left + r.width * dx}px, ${r.top - p.top + r.height * dy}px)`;
    cursor.classList.add('show');
  }
  function click(el) {
    cursor.classList.remove('click');
    void cursor.offsetWidth;
    cursor.classList.add('click');
    el?.classList.add('on');
  }
  const hideCursor = () => cursor.classList.remove('show');
  const badge = (text) => {
    const b = L('[data-badge]');
    b.textContent = text || '';
    b.classList.toggle('show', !!text);
  };

  // ---------- Línea de tiempo ----------
  const typed = 'TU MARCA';
  const events = [
    [0, reset],
    [0.5, () => moveTo(L('[data-card="bolsa-papel"]'))],
    [1.4, () => moveTo(L('[data-card="frasco"]'))],
    [2.2, () => moveTo(L('[data-card="caja-rectangular"]'))],
    [2.8, () => click(L('[data-card="caja-rectangular"]'))],
    [3.4, () => {
      L('.tut-cards').classList.remove('show');
      hideCursor();
      canvas.style.opacity = '1';
      render({ animate: true });
      viewer.autoRotate = true;
    }],
    [6.0, () => L('.tut-panel').classList.add('show')],
    [6.6, () => moveTo(L('[data-sw="#4A7C59"]'))],
    [7.2, () => { click(L('[data-sw="#4A7C59"]')); set({ color: '#4A7C59', textColor: '#FFFFFF' }); }],
    [7.8, () => moveTo(L('.tut-input'), 0.25)],
    [8.1, () => { click(L('.tut-input')); L('.tut-input').classList.add('focus'); }],
    ...[...typed].map((_, i) => [8.3 + i * 0.16, () => {
      L('[data-typed]').textContent = typed.slice(0, i + 1);
      set({ text: typed.slice(0, i + 1) });
    }]),
    [9.8, () => { L('.tut-input').classList.remove('focus'); moveTo(L('[data-gr="leaf"]')); }],
    [10.3, () => { click(L('[data-gr="leaf"]')); set({ graphic: 'leaf', graphicColor: '#E2A036' }); }],
    [10.9, () => moveTo(L('[data-pt="dots"]'))],
    [11.4, () => { click(L('[data-pt="dots"]')); set({ pattern: 'dots', patternColor: '#FFFFFF', subtext: 'Productos naturales' }); }],
    [12.4, () => { L('.tut-panel').classList.remove('show'); hideCursor(); prepareDieline(); }],
    [13.0, () => { viewer.autoRotate = false; viewer.setView('front'); badge('Frente'); }],
    [14.5, () => { viewer.setView('side'); badge('Lateral'); }],
    [16.0, () => { viewer.setView('top'); badge('Superior'); }],
    [17.4, () => { viewer.setView('iso'); badge('Vista 3D'); viewer.autoRotate = true; }],
    [18.8, () => badge('')],
    [19.0, () => { L('.tut-export').classList.add('show'); viewer.autoRotate = false; canvas.style.opacity = '0'; }],
    [20.0, () => moveTo(L('[data-dl]'))],
    [20.7, () => { click(L('[data-dl]')); }],
    [21.0, () => L('[data-toast]').classList.add('show')],
    [23.2, hideCursor],
  ];

  let dieline = null;
  async function prepareDieline() {
    const c = await renderDieline(base, design);
    dieline = c.toDataURL('image/png');
    L('[data-dieline]').src = dieline;
  }

  function reset() {
    design = plain();
    L('[data-typed]').textContent = '';
    layer.querySelectorAll('.on, .show, .focus').forEach((el) => el.classList.remove('on', 'show', 'focus'));
    L('.tut-cards').classList.add('show');
    canvas.style.opacity = '0';
    viewer.autoRotate = false;
    viewer.setView('iso', false);
    render();
  }

  // ---------- Reproductor ----------
  let t = 0;
  let next = 0;
  let playing = false;
  let last = 0;
  const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

  function paint() {
    const step = STEP_STARTS.filter((s) => t >= s).length - 1;
    steps.forEach((li, i) => li.classList.toggle('active', i === step));
    q('[data-caption]').textContent = t >= DURATION ? '¡Listo para imprimir!' : CAPTIONS[step];
    q('[data-progress]').style.width = `${(t / DURATION) * 100}%`;
    q('[data-progressbar]').setAttribute('aria-valuenow', String(Math.floor(t)));
    q('[data-time]').textContent = `${fmt(t)} / ${fmt(DURATION)}`;
  }

  function runEvents() {
    while (next < events.length && events[next][0] <= t) events[next++][1]();
  }

  function tick(now) {
    if (pop) {
      const p = Math.min(1, (now - pop.start) / 600);
      const s = 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2; // ease-out-back
      pop.model.scale.setScalar(Math.max(0.01, s));
      if (p === 1) pop = null;
    }
    if (!playing) return;
    t = Math.min(DURATION, t + (now - last) / 1000);
    last = now;
    runEvents();
    paint();
    if (t >= DURATION) {
      // Repite tras una pausa corta
      setTimeout(() => { if (playing) { t = 0; next = 0; last = performance.now(); requestAnimationFrame(tick); } }, 1500);
      return;
    }
    requestAnimationFrame(tick);
  }

  function setIcons() {
    q('[data-toggle]').innerHTML = playing ? icons.pause : icons.play;
    q('[data-toggle]').setAttribute('aria-label', playing ? 'Pausar tutorial' : 'Reproducir tutorial');
    q('[data-play]').innerHTML = icons.play;
    q('[data-play]').classList.toggle('hidden', playing);
  }

  function play() {
    if (playing) return;
    if (t >= DURATION) { t = 0; next = 0; }
    playing = true;
    setIcons();
    last = performance.now();
    requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    setIcons();
  }

  q('[data-play]').addEventListener('click', play);
  q('[data-toggle]').addEventListener('click', () => (playing ? pause() : play()));
  q('[data-full]').innerHTML = icons.expand;
  q('[data-full]').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.()));

  // Se reproduce sola al verla (salvo "reducir movimiento") y se pausa al salir de pantalla
  let userPaused = false;
  q('[data-toggle]').addEventListener('click', () => { userPaused = !playing; });
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) pause();
    else if (!reducedMotion && !userPaused) play();
  }, { threshold: 0.5 }).observe(root);

  runEvents();
  setIcons();
  paint();
}
