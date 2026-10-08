// Núcleo gráfico de PackLab:
//  - dibuja la cara del empaque (colores, fondo, logo, gráfico y textos) en un canvas 2D
//  - construye el modelo 3D de cada plantilla con Three.js
//  - genera el plano troquelado (dieline) para exportar
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const FONTS = [
  { name: 'Montserrat', weight: 800 },
  { name: 'DM Serif Display', weight: 400 },
  { name: 'Nunito', weight: 800 },
  { name: 'Montserrat Alternates', weight: 600 },
  { name: 'Playfair Display', weight: 700 },
  { name: 'Pacifico', weight: 400 },
  { name: 'Space Mono', weight: 700 },
];

// Paleta de la guía de marca: crema, durazno, kraft, blanco, rosa, terracota, salvia y café.
export const COLORS = ['#F6E1C8', '#F0BE88', '#DDB48C', '#FFFFFF', '#E9A99B', '#C0532D', '#5B7B52', '#6A2D13'];

export const GRAPHICS = {
  // Rama en línea (estilo ilustración de la guía de marca)
  branch: '<g fill="none" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21.5C9 15.5 12.3 9.3 18.5 2.5"/><path d="M9.3 15.6C6.6 16 4.6 14.5 4 11.9c2.6-.3 4.7 1.2 5.3 3.7z"/><path d="M7.8 18.6c-2.4 1-4.5.4-5.7-1.6 2.4-.9 4.4-.3 5.7 1.6z"/><path d="M11.4 12.3c-.6-2.7.5-4.9 3-6 .6 2.6-.5 4.8-3 6z"/><path d="M12.8 10.6c2.6-1 5-.2 6.3 2.1-2.6.9-4.9 0-6.3-2.1z"/><path d="M15.6 6.6c0-2.3 1.4-3.8 3.7-4.1-.1 2.3-1.4 3.7-3.7 4.1z"/></g>',
  leaf: '<path d="M12 2C8 6 8 12 12 16C16 12 16 6 12 2z"/><path d="M11 17C6 17 3 13 2 8C7 8 10 12 11 17z"/><path d="M13 17C18 17 21 13 22 8C17 8 14 12 13 17z"/><path d="M11.4 16h1.2v6h-1.2z"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  flower: `<g transform="translate(12 12)">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-5.5" rx="3" ry="5" transform="rotate(${a})"/>`).join('')}</g><circle cx="12" cy="12" r="2.6" fill="#fff" opacity=".85"/>`,
  heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  sun: `<circle cx="12" cy="12" r="4.5"/><g transform="translate(12 12)">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-1" y="-11" width="2" height="4" rx="1" transform="rotate(${a})"/>`).join('')}</g>`,
  seal: '<path d="M12 1l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.3 3.2 1.3 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.4 13 2.1 9.8l3-1.7.9-3.3 3.4.4z"/>',
};

export const PATTERNS = [
  { key: 'none', label: 'Liso' },
  { key: 'dots', label: 'Puntos' },
  { key: 'stripes', label: 'Rayas' },
  { key: 'grid', label: 'Cuadros' },
  { key: 'waves', label: 'Ondas' },
  { key: 'kraft', label: 'Kraft' },
  { key: 'organic', label: 'Orgánico' },
];

export function graphicSVG(key, color = 'currentColor') {
  return `<svg viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="0" aria-hidden="true">${GRAPHICS[key] || ''}</svg>`;
}

export function defaultDesign(template) {
  return {
    color: template?.base_color || '#F6E1C8',
    text: 'TU MARCA',
    subtext: 'Productos naturales',
    textColor: '#6A2D13',
    font: 'Montserrat',
    fontSize: 30,
    align: 'center',
    valign: 'middle',
    logo: null,
    image: null,
    graphic: 'branch',
    graphicColor: '#6A2D13',
    pattern: 'none',
    patternColor: '#E9A27A',
  };
}

// ---------------------------------------------------------------------------
// Recursos (imágenes y fuentes)
// ---------------------------------------------------------------------------
const imageCache = new Map();

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    }));
  }
  return imageCache.get(src);
}

function graphicImage(key, color) {
  if (!GRAPHICS[key]) return Promise.resolve(null);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" fill="${color}" stroke="${color}" stroke-width="0">${GRAPHICS[key]}</svg>`;
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function fontSpec(design) {
  const f = FONTS.find((x) => x.name === design.font) || FONTS[0];
  return { family: `"${f.name}"`, weight: f.weight };
}

async function loadAssets(design) {
  const { family, weight } = fontSpec(design);
  await Promise.all([
    document.fonts.load(`${weight} 40px ${family}`).catch(() => {}),
    document.fonts.load('600 40px "Nunito"').catch(() => {}),
  ]);
  const [logo, image, graphic] = await Promise.all([
    loadImage(design.logo),
    loadImage(design.image),
    graphicImage(design.graphic, design.graphicColor),
  ]);
  return { logo, image, graphic };
}

// ---------------------------------------------------------------------------
// Dibujo 2D de las caras
// ---------------------------------------------------------------------------
function drawCover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

// unit: px por 1/20 cm, para que el patrón tenga la misma escala en todas las caras
function drawPattern(ctx, W, H, design, unit) {
  if (!design.pattern || design.pattern === 'none') return;
  ctx.save();
  ctx.fillStyle = design.patternColor;
  ctx.strokeStyle = design.patternColor;
  ctx.globalAlpha = 0.35;
  const s = unit * 28;
  switch (design.pattern) {
    case 'dots':
      for (let y = s / 2; y < H; y += s) {
        for (let x = (Math.round(y / s) % 2 ? s : s / 2); x < W; x += s) {
          ctx.beginPath();
          ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'stripes':
      ctx.lineWidth = s * 0.3;
      for (let x = -H; x < W + H; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + H, H);
        ctx.stroke();
      }
      break;
    case 'grid':
      ctx.lineWidth = Math.max(1, s * 0.06);
      for (let x = 0; x < W; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      break;
    case 'waves':
      ctx.lineWidth = s * 0.1;
      for (let y = s / 2; y < H + s; y += s * 0.8) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) ctx.lineTo(x, y + Math.sin(x / s * Math.PI) * s * 0.18);
        ctx.stroke();
      }
      break;
    case 'kraft': {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#6B4F3A';
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const n = Math.round((W * H) / (unit * unit * 60));
      for (let i = 0; i < n; i++) ctx.fillRect(rand() * W, rand() * H, unit * (0.6 + rand() * 1.4), unit * 0.6);
      break;
    }
    case 'organic': {
      // Manchas orgánicas en las esquinas, como en los empaques de la guía de marca
      ctx.globalAlpha = 0.92;
      const m = Math.min(W, H);
      const colors = [design.patternColor, '#C0532D', '#5B7B52', '#F0BE88', '#E9A27A'];
      const anchors = [[0.02, 0.98, 0.62], [1.0, 0.04, 0.5], [0.98, 0.9, 0.34], [0.08, 0.1, 0.24], [0.62, 1.04, 0.3]];
      let seed = 11;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      anchors.forEach(([ax, ay, k], i) => {
        const cx = ax * W;
        const cy = ay * H;
        const r = k * m;
        const n = 7;
        const pts = Array.from({ length: n }, (_, j) => {
          const a = (j / n) * Math.PI * 2;
          const rr = r * (0.72 + rand() * 0.42);
          return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
        });
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const start = mid(pts[n - 1], pts[0]);
        ctx.moveTo(start[0], start[1]);
        pts.forEach((p, j) => {
          const q = mid(p, pts[(j + 1) % n]);
          ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]);
        });
        ctx.fill();
      });
      break;
    }
    default:
  }
  ctx.restore();
}

function drawBackground(ctx, W, H, design, assets, patternUnit) {
  ctx.fillStyle = design.color;
  ctx.fillRect(0, 0, W, H);
  if (assets.image) {
    drawCover(ctx, assets.image, 0, 0, W, H);
  }
  drawPattern(ctx, W, H, design, patternUnit);
}

function fitText(ctx, text, font, size, maxWidth) {
  let s = size;
  ctx.font = font(s);
  while (s > 8 && ctx.measureText(text).width > maxWidth) {
    s *= 0.92;
    ctx.font = font(s);
  }
  return s;
}

/**
 * Dibuja logo + gráfico + textos dentro del rectángulo (x0, y0, W, H).
 * Sin design.positions los apila según align/valign; con positions, cada elemento
 * se centra en su punto (coordenadas 0..1 relativas a la cara).
 * Devuelve la caja de cada elemento en coordenadas 0..1 (para arrastrarlos en el editor).
 */
function drawContent(ctx, x0, y0, W, H, design, assets, unit) {
  const pad = Math.min(W, H) * 0.09;
  const base = Math.min(W, H);
  const { family, weight } = fontSpec(design);
  const items = [];

  if (assets.logo) {
    const box = base * 0.3 * (design.logoScale || 1);
    const r = Math.min(box / assets.logo.width, box / assets.logo.height);
    items.push({ key: 'logo', type: 'img', img: assets.logo, w: assets.logo.width * r, h: assets.logo.height * r });
  }
  if (assets.graphic) {
    const size = base * (assets.logo ? 0.16 : 0.26);
    items.push({ key: 'graphic', type: 'img', img: assets.graphic, w: size, h: size });
  }
  const maxW = W - pad * 2;
  if (design.text) {
    const font = (s) => `${weight} ${s}px ${family}`;
    const size = fitText(ctx, design.text, font, design.fontSize * unit, maxW);
    ctx.font = font(size);
    items.push({ key: 'text', type: 'text', text: design.text, font: font(size), w: ctx.measureText(design.text).width, h: size, color: design.textColor });
  }
  if (design.subtext) {
    const font = (s) => `600 ${s}px "Nunito"`;
    const size = fitText(ctx, design.subtext, font, design.fontSize * unit * 0.42, maxW);
    ctx.font = font(size);
    items.push({ key: 'subtext', type: 'text', text: design.subtext, font: font(size), w: ctx.measureText(design.subtext).width, h: size * 1.1, color: design.textColor, alpha: 0.8 });
  }
  if (!items.length) return [];

  // Posición apilada (por defecto): centro de cada elemento
  const gap = base * 0.035;
  const total = items.reduce((sum, it) => sum + it.h, 0) + gap * (items.length - 1);
  let y = y0 + (design.valign === 'top' ? pad : design.valign === 'bottom' ? H - pad - total : (H - total) / 2);
  for (const it of items) {
    const left = design.align === 'left' ? x0 + pad : design.align === 'right' ? x0 + W - pad - it.w : x0 + (W - it.w) / 2;
    it.cx = left + it.w / 2;
    it.cy = y + it.h / 2;
    y += it.h + gap;
    const free = design.positions?.[it.key];
    if (free) {
      it.cx = x0 + Math.min(1, Math.max(0, free.x)) * W;
      it.cy = y0 + Math.min(1, Math.max(0, free.y)) * H;
    }
  }

  for (const it of items) {
    if (it.type === 'img') {
      ctx.drawImage(it.img, it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h);
    } else {
      ctx.save();
      ctx.font = it.font;
      ctx.fillStyle = it.color;
      ctx.globalAlpha = it.alpha ?? 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.text, it.cx, it.cy);
      ctx.restore();
    }
  }
  return items.map((it) => ({
    key: it.key, x: (it.cx - x0) / W, y: (it.cy - y0) / H, w: it.w / W, h: it.h / H,
  }));
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/**
 * Canvas de una cara.
 * kind: 'front' (diseño completo) | 'plain' (solo fondo)
 * Las medidas se pasan en cm para conservar la proporción real.
 */
export async function renderFace(design, wCm, hCm, { kind = 'front', px = 1024 } = {}) {
  const assets = await loadAssets(design);
  const ratio = hCm / wCm;
  const W = ratio > 1 ? px / ratio : px;
  const H = ratio > 1 ? px : px * ratio;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const unit = canvas.width / 400; // fontSize se define sobre una cara de 400px de ancho
  drawBackground(ctx, canvas.width, canvas.height, design, kind === 'front' ? assets : {}, canvas.width / wCm / 20);
  canvas.layout = kind === 'front' ? drawContent(ctx, 0, 0, canvas.width, canvas.height, design, assets, unit) : [];
  return canvas;
}

/** Etiqueta envolvente para frascos: el diseño queda centrado al frente. */
async function renderWrapLabel(design, circCm, hCm, px = 2048) {
  const assets = await loadAssets(design);
  const canvas = makeCanvas(px, (px * hCm) / circCm);
  const ctx = canvas.getContext('2d');
  const front = canvas.width * 0.42;
  const unit = front / 400;
  drawBackground(ctx, canvas.width, canvas.height, design, assets, canvas.width / circCm / 20);
  drawContent(ctx, (canvas.width - front) / 2, 0, front, canvas.height, design, assets, unit);
  return canvas;
}

/** Plantilla con las medidas personalizadas del diseño (design.dims, en cm). */
export function effectiveTemplate(template, design) {
  const d = design?.dims;
  if (!d) return template;
  const t = { ...template, width: d.width ?? template.width, height: d.height ?? template.height, depth: d.depth ?? template.depth };
  if (t.shape === 'jar') t.depth = t.width;
  return t;
}

/** Medidas (cm) de la cara editable: el frente del empaque o la zona visible de la etiqueta del frasco. */
export function faceDims(template) {
  if (template.shape === 'jar') return { w: Math.PI * template.width * 0.42, h: template.height * 0.82 * 0.6 };
  return { w: template.width, h: template.height };
}

/** Cara frontal tal como se imprime (respeta medidas personalizadas). */
export function renderFrontFace(template, design, opts) {
  const { w, h } = faceDims(effectiveTemplate(template, design));
  return renderFace(design, w, h, opts);
}

// ---------------------------------------------------------------------------
// Modelos 3D
// ---------------------------------------------------------------------------
function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const mat = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...opts });

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

function handle(radius, tube, color) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 40, Math.PI), mat({ color, roughness: 0.6 }));
  mesh.castShadow = true;
  return mesh;
}

/** Crea el grupo 3D de una plantilla. Medidas en cm escaladas a unidades de escena. */
export async function buildPackage(baseTemplate, design) {
  const template = effectiveTemplate(baseTemplate, design);
  const k = 3 / Math.max(template.width, template.height, template.depth);
  const w = template.width * k;
  const h = template.height * k;
  const d = Math.max(template.depth * k, 0.02);
  const group = new THREE.Group();
  const shape = template.shape;

  if (shape === 'jar') {
    const r = w / 2;
    const bodyH = h * 0.82;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, bodyH, 64),
      new THREE.MeshPhysicalMaterial({ color: template.base_color, roughness: 0.25, clearcoat: 0.6 }),
    );
    body.position.y = bodyH / 2;
    const labelH = bodyH * 0.6;
    const labelCanvas = await renderWrapLabel(design, Math.PI * template.width, template.height * 0.82 * 0.6);
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.005, r * 1.005, labelH, 64, 1, true, -Math.PI, Math.PI * 2),
      mat({ map: texture(labelCanvas), roughness: 0.6 }),
    );
    label.position.y = bodyH * 0.47;
    const lidH = h * 0.18;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, lidH, 64), mat({ color: shade(design.color, -0.06), roughness: 0.7 }));
    lid.position.y = bodyH + lidH / 2;
    [body, label, lid].forEach((m) => { m.castShadow = true; group.add(m); });
    return group;
  }

  const front = texture(await renderFace(design, template.width, template.height));
  const plain = texture(await renderFace(design, template.depth || 1, template.height, { kind: 'plain', px: 512 }));
  const top = shape === 'food'
    ? texture(await renderFace({ ...design, valign: 'middle', positions: null }, template.width, template.depth))
    : texture(await renderFace(design, template.width, template.depth || 1, { kind: 'plain', px: 512 }));

  const sideMat = mat({ map: plain });
  const frontMat = mat({ map: front });
  const topMat = mat({ map: top });
  const isLabel = shape === 'label';
  const white = mat({ color: '#F4F4F4' });
  const materials = isLabel
    ? [white, white, white, white, frontMat, white]
    : [sideMat, sideMat, topMat, sideMat, frontMat, frontMat];

  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
  box.position.y = h / 2;
  box.castShadow = true;
  group.add(box);

  if (shape === 'case') {
    const hd = handle(w * 0.2, 0.035, shade(design.color, -0.2));
    hd.position.set(0, h, 0);
    group.add(hd);
  }
  if (shape === 'bag') {
    const color = '#5B4636';
    [d * 0.32, -d * 0.32].forEach((z) => {
      const hd = handle(w * 0.2, 0.025, color);
      hd.position.set(0, h, z);
      group.add(hd);
    });
  }
  if (shape === 'gift') {
    const ribbon = mat({ color: design.graphicColor, roughness: 0.45 });
    const rw = Math.min(w, d) * 0.12;
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.002, 0.012, rw), ribbon);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.012, d * 1.002), ribbon);
    s1.position.y = s2.position.y = h + 0.006;
    group.add(s1, s2);
    [-1, 1].forEach((side) => {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(rw * 1.4, rw * 0.28, 10, 32), ribbon);
      loop.scale.set(1, 0.7, 1);
      loop.position.set(side * rw * 1.3, h + rw * 0.9, 0);
      loop.rotation.set(0, side * 0.35, side * 0.5);
      loop.castShadow = true;
      group.add(loop);
    });
  }
  if (isLabel) group.rotation.x = -0.12;
  return group;
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
  });
}

// ---------------------------------------------------------------------------
// Escena y visor interactivo
// ---------------------------------------------------------------------------
const VIEW_DIRS = {
  iso: [1, 0.7, 1.35],
  front: [0, 0.18, 1],
  side: [1, 0.18, 0],
  back: [0, 0.18, -1],
  top: [0.001, 1, 0.35],
};

function createStage(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#d8cfc0', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#fff5ea', 0.8);
  fill.position.set(-5, 3, -2);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  return { scene, camera };
}

function frame(camera, object, view = 'iso', zoom = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dist = (sphere.radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.08 / zoom;
  const dir = new THREE.Vector3(...VIEW_DIRS[view]).normalize();
  return { target: sphere.center.clone(), position: sphere.center.clone().add(dir.multiplyScalar(dist)) };
}

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class PackageViewer {
  /**
   * @param {HTMLElement} container
   * @param {{autoRotate?: boolean, label?: string, keyboard?: boolean}} opts
   */
  constructor(container, { autoRotate = false, label = 'Vista 3D del empaque', keyboard = true } = {}) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.classList.add('three');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', label);
    container.prepend(this.renderer.domElement);
    Object.assign(this, createStage(this.renderer));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.autoRotate = autoRotate && !REDUCED_MOTION;
    this.controls.autoRotateSpeed = 1.6;
    this.controls.addEventListener('start', () => { this.tween = null; });

    // Alternativa de teclado al arrastre: flechas giran, +/- acercan.
    if (keyboard) {
      container.tabIndex = 0;
      container.setAttribute('aria-label', `${label}. Usa las flechas para girar y + o - para acercar.`);
      container.addEventListener('keydown', (e) => this.onKey(e));
    }

    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(container);
    this.resize();

    // Solo renderiza cuando el visor está en pantalla y la pestaña visible.
    this.visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.kick(); }).observe(container);
    }
    document.addEventListener('visibilitychange', () => this.kick());
    this.loop = this.loop.bind(this);
    this.running = false;
    this.kick();
  }

  kick() {
    if (this.running || !this.visible || document.hidden) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  onKey(e) {
    const step = Math.PI / 12;
    const az = { ArrowLeft: -step, ArrowRight: step }[e.key];
    const pol = { ArrowUp: -step, ArrowDown: step }[e.key];
    if (az || pol) {
      e.preventDefault();
      const offset = this.camera.position.clone().sub(this.controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta -= az || 0;
      sph.phi = THREE.MathUtils.clamp(sph.phi + (pol || 0), 0.15, this.controls.maxPolarAngle);
      this.moveCamera({ target: this.controls.target.clone(), position: this.controls.target.clone().add(new THREE.Vector3().setFromSpherical(sph)) });
    } else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoom(1.2); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); this.zoom(0.83); }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  loop(t) {
    if (!this.visible || document.hidden) { this.running = false; return; }
    if (this.tween) {
      const p = REDUCED_MOTION ? 1 : Math.min(1, (t - this.tween.start) / 450);
      const e = 1 - (1 - p) ** 3;
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, e);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, e);
      if (p === 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }

  /** Reemplaza el modelo. Devuelve cuando el nuevo modelo ya está en escena. */
  async setPackage(template, design) {
    const token = (this.token = Symbol('load'));
    const group = await buildPackage(template, design);
    if (token !== this.token) { disposeGroup(group); return; }
    const first = !this.model;
    if (this.model) { this.scene.remove(this.model); disposeGroup(this.model); }
    this.model = group;
    this.scene.add(group);
    if (first) this.setView(this.view || 'iso', false);
  }

  /** Muestra un grupo ya construido (p. ej. una composición de varios empaques). */
  setGroup(group) {
    if (this.model) { this.scene.remove(this.model); disposeGroup(this.model); }
    this.model = group;
    this.scene.add(group);
    this.setView(this.view || 'iso', false);
  }

  setView(view, animate = true) {
    if (!this.model) { this.view = view; return; }
    this.view = view;
    this.zoomLevel = 1;
    this.moveCamera(frame(this.camera, this.model, view), animate);
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(1 / factor);
    const len = THREE.MathUtils.clamp(offset.length(), this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(len);
    this.moveCamera({ target: this.controls.target.clone(), position: this.controls.target.clone().add(offset) });
  }

  moveCamera({ target, position }, animate = true) {
    if (!animate) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      return;
    }
    this.tween = {
      start: performance.now(),
      fromPos: this.camera.position.clone(), toPos: position,
      fromTarget: this.controls.target.clone(), toTarget: target,
    };
  }

  set autoRotate(v) { this.controls.autoRotate = v && !REDUCED_MOTION; }
  get autoRotate() { return this.controls.autoRotate; }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}

// Render fuera de pantalla para miniaturas y exportaciones.
let offscreen;
export async function renderSnapshot(template, design, { width = 480, height = 360, view = 'iso' } = {}) {
  if (!offscreen) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    offscreen = { renderer, ...createStage(renderer) };
  }
  const { renderer, scene, camera } = offscreen;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const group = await buildPackage(template, design);
  scene.add(group);
  const { position, target } = frame(camera, group, view);
  camera.position.copy(position);
  camera.lookAt(target);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  disposeGroup(group);
  return url;
}

// ---------------------------------------------------------------------------
// Plano troquelado (dieline)
// ---------------------------------------------------------------------------
const rect = (x, y, w, h, fill) => ({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, box: [x, y, w, h] });
const poly = (pts, fill) => ({ pts, fill });

function boxPieces(W, H, D, { lids = true } = {}) {
  const g = Math.min(1.5, D * 0.6); // pestaña de pegado
  const tuck = Math.min(2, D * 0.35);
  const dust = D * 0.6;
  const y0 = lids ? D + tuck : 3;
  const xs = [0, W, W + D, 2 * W + D, 2 * W + 2 * D];
  const pieces = [
    rect(xs[0], y0, W, H, 'front'), // trasera
    rect(xs[1], y0, D, H, 'plain'),
    rect(xs[2], y0, W, H, 'front'),
    rect(xs[3], y0, D, H, 'plain'),
    poly([[xs[4], y0], [xs[4] + g, y0 + g], [xs[4] + g, y0 + H - g], [xs[4], y0 + H]], 'color'),
  ];
  if (lids) {
    pieces.push(
      rect(xs[0], y0 - D, W, D, 'top'),
      poly([[xs[0], y0 - D], [xs[0] + W, y0 - D], [xs[0] + W - tuck * 0.4, y0 - D - tuck], [xs[0] + tuck * 0.4, y0 - D - tuck]], 'color'),
      rect(xs[2], y0 + H, W, D, 'top'),
      poly([[xs[2], y0 + H + D], [xs[2] + W, y0 + H + D], [xs[2] + W - tuck * 0.4, y0 + H + D + tuck], [xs[2] + tuck * 0.4, y0 + H + D + tuck]], 'color'),
    );
    [xs[1], xs[3]].forEach((x) => {
      pieces.push(
        poly([[x, y0], [x + D, y0], [x + D * 0.85, y0 - dust], [x + D * 0.15, y0 - dust]], 'color'),
        poly([[x, y0 + H], [x + D, y0 + H], [x + D * 0.85, y0 + H + dust], [x + D * 0.15, y0 + H + dust]], 'color'),
      );
    });
  } else {
    // Bolsa: dobladillo superior y fondo
    xs.slice(0, 4).forEach((x, i) => {
      const w = i % 2 ? D : W;
      pieces.push(rect(x, y0 - 3, w, 3, 'color'), rect(x, y0 + H, w, D * 0.75, 'color'));
    });
  }
  return pieces;
}

function edgesOf(pieces) {
  const key = (a, b) => {
    const p = [a, b].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).sort();
    return p.join('|');
  };
  const map = new Map();
  pieces.forEach(({ pts }) => pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const kk = key(a, b);
    map.set(kk, { a, b, n: (map.get(kk)?.n || 0) + 1 });
  }));
  return [...map.values()];
}

/** Devuelve un canvas con el plano troquelado listo para imprimir. */
export async function renderDieline(baseTemplate, design) {
  const template = effectiveTemplate(baseTemplate, design);
  const W = template.width;
  const H = template.height;
  const D = template.depth;
  let pieces;
  if (template.shape === 'jar') {
    pieces = [rect(0, 0, Math.PI * W, H * 0.82 * 0.6, 'wrap')];
  } else if (template.shape === 'label') {
    pieces = [rect(0, 0, W, H, 'front')];
  } else {
    pieces = boxPieces(W, H, D, { lids: template.shape !== 'bag' });
  }

  const xsAll = pieces.flatMap((p) => p.pts.map((pt) => pt[0]));
  const ysAll = pieces.flatMap((p) => p.pts.map((pt) => pt[1]));
  const minX = Math.min(...xsAll); const minY = Math.min(...ysAll);
  const spanX = Math.max(...xsAll) - minX; const spanY = Math.max(...ysAll) - minY;
  const S = Math.min(40, 2800 / spanX, 2800 / spanY); // px por cm
  const margin = 60;
  const legend = 70;
  const canvas = makeCanvas(spanX * S + margin * 2, spanY * S + margin * 2 + legend);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tx = (x) => margin + (x - minX) * S;
  const ty = (y) => margin + (y - minY) * S;

  const faces = {
    front: await renderFace(design, W, H, { px: 1200 }),
    plain: await renderFace(design, D || 1, H, { kind: 'plain', px: 600 }),
    top: template.shape === 'food'
      ? await renderFace({ ...design, valign: 'middle', positions: null }, W, D)
      : await renderFace(design, W, D || 1, { kind: 'plain', px: 600 }),
    wrap: template.shape === 'jar' ? await renderWrapLabel(design, Math.PI * W, H * 0.82 * 0.6) : null,
  };

  for (const p of pieces) {
    ctx.save();
    ctx.beginPath();
    p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(tx(x), ty(y)) : ctx.moveTo(tx(x), ty(y))));
    ctx.closePath();
    ctx.fillStyle = design.color;
    ctx.fill();
    const img = faces[p.fill];
    if (img && p.box) {
      const [x, y, w, h] = p.box;
      ctx.drawImage(img, tx(x), ty(y), w * S, h * S);
    }
    ctx.restore();
  }

  ctx.lineWidth = 2;
  for (const { a, b, n } of edgesOf(pieces)) {
    ctx.beginPath();
    ctx.setLineDash(n > 1 ? [10, 7] : []);
    ctx.strokeStyle = n > 1 ? '#C0532D' : '#2B1D15';
    ctx.moveTo(tx(a[0]), ty(a[1]));
    ctx.lineTo(tx(b[0]), ty(b[1]));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const ly = canvas.height - legend / 2 - 4;
  ctx.font = '600 18px "Nunito", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1F2A33';
  ctx.strokeStyle = '#1F2A33';
  ctx.beginPath(); ctx.moveTo(margin, ly); ctx.lineTo(margin + 40, ly); ctx.stroke();
  ctx.fillText('Corte', margin + 50, ly);
  ctx.strokeStyle = '#C0532D';
  ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(margin + 120, ly); ctx.lineTo(margin + 160, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('Doblez', margin + 170, ly);
  ctx.font = '700 18px "Space Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${template.name} · ${W} × ${H} × ${D} cm · PackLab`, canvas.width - margin, ly);
  return canvas;
}

export function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      downloadBlob(blob, filename);
      resolve();
    }, 'image/png');
  });
}

export function downloadDataURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadDataURL(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
