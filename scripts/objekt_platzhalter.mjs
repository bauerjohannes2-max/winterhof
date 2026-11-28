// ============================================================================
// Platzhalter-Sprites für Baustein 10 „Alle übrigen Gebäude + Deko“
// (Entscheidungen 39, 64; 100 % GRÜN in scripts/pruefe_assets.py)
// Erzeugt die 25 fehlenden Objekt-Bilder + station_ribbon.png per SVG → sharp
// nach art_src/spiel{m}/objekte{tps}/ (ohne Bild-Kontingent, später 1:1 tauschbar).
// ============================================================================
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'art_src', 'spiel{m}', 'objekte{tps}');
const CONTENT = JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'winterhof.json'), 'utf8'));

const TILE_PX = CONTENT.art.tilePx; // 128
const PX_PER_WORLD = 1.72;          // > 1.6 minSourcePxPerWorldPx, trotzdem kompakter Atlas
const even = (n) => Math.ceil(n / 2) * 2;
const round1 = (n) => n.toFixed(1);

function makeCanvas(sizeKey, widthFactor = 1.04, cyFrac = null) {
  const sz = CONTENT.sizes[sizeKey];
  if (!sz) throw new Error(`sizes.${sizeKey} fehlt`);
  const w = sz.w ?? 1;
  const h = sz.h ?? 1;
  const ht = sz.heightTiles;
  const H = even(ht * TILE_PX * PX_PER_WORLD);
  const pxTile = H / ht;
  const diamondW = ((w + h) / 2) * pxTile;
  const W = even(diamondW * widthFactor);
  const cx = W / 2;
  const footY = H * 0.986;
  const halfDiamondH = ((w + h) / 8) * pxTile;
  const cy = cyFrac !== null ? H * cyFrac : footY - halfDiamondH;
  const anchorY = +(cy / H).toFixed(3);

  const iso = (du, dv, dz = 0) => [
    cx + (du - dv) * 0.5 * pxTile,
    cy + (du + dv) * 0.25 * pxTile - dz * pxTile
  ];
  const poly = (pts, attrs = '') =>
    `<polygon points="${pts.map(([x, y]) => `${round1(x)},${round1(y)}`).join(' ')}" ${attrs}/>`;
  const pathPts = (pts, close = true) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${round1(x)} ${round1(y)}`).join(' ') + (close ? ' Z' : '');

  /** Isometrischer Quader [u0..u1] × [v0..v1] × [z0..z1]. */
  const box = (u0, v0, u1, v1, z0, z1, colTop, colLeft, colRight, stroke = 'none', sw = 1.5) => {
    const t0 = iso(u0, v0, z1), t1 = iso(u1, v0, z1), t2 = iso(u1, v1, z1), t3 = iso(u0, v1, z1);
    const b1 = iso(u1, v0, z0), b2 = iso(u1, v1, z0), b3 = iso(u0, v1, z0);
    const st = stroke === 'none' ? '' : `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`;
    return [
      poly([t3, t2, b2, b3], `fill="${colLeft}" ${st}`),
      poly([t2, t1, b1, b2], `fill="${colRight}" ${st}`),
      poly([t0, t1, t2, t3], `fill="${colTop}" ${st}`)
    ].join('');
  };

  /** Satteldach mit echtem Giebel, Überstand und dicker weicher Schneehaube. */
  const gableRoof = (u0, v0, u1, v1, z0, z1, axis, roofLight, roofDark, gableCol, snowCap = true) => {
    if (axis === 'u') {
      const vm = (v0 + v1) / 2;
      const r0 = iso(u0, vm, z1), r1 = iso(u1, vm, z1);
      const e00 = iso(u0, v0, z0), e10 = iso(u1, v0, z0), e11 = iso(u1, v1, z0), e01 = iso(u0, v1, z0);
      const out = [
        poly([e10, r1, e11], `fill="${gableCol}" stroke="#59351c" stroke-width="1.4" stroke-linejoin="round"`),
        poly([r0, e00, e10, r1], `fill="${roofDark}"`),
        poly([e01, r0, r1, e11], `fill="${roofLight}"`)
      ];
      if (snowCap) {
        const s0 = iso(u0 - 0.04, vm, z1 + 0.04), s1 = iso(u1 + 0.04, vm, z1 + 0.04);
        const f0 = iso(u0 - 0.04, v1 + 0.05, z0 - 0.02), f1 = iso(u1 + 0.04, v1 + 0.05, z0 - 0.02);
        const b0 = iso(u0 - 0.04, v0 - 0.03, z0 + 0.02), b1 = iso(u1 + 0.04, v0 - 0.03, z0 + 0.02);
        out.push(poly([s0, b0, b1, s1], 'fill="#d8e7f4"'));
        out.push(poly([s0, s1, f1, f0], 'fill="#f4f9ff"'));
        out.push(`<path d="${pathPts([f0, f1], false)}" fill="none" stroke="#ffffff" stroke-width="${round1(pxTile * 0.055)}" stroke-linecap="round"/>`);
      }
      return out.join('');
    }
    const um = (u0 + u1) / 2;
    const r0 = iso(um, v0, z1), r1 = iso(um, v1, z1);
    const e00 = iso(u0, v0, z0), e10 = iso(u1, v0, z0), e11 = iso(u1, v1, z0), e01 = iso(u0, v1, z0);
    const out = [
      poly([e01, r1, e11], `fill="${gableCol}" stroke="#59351c" stroke-width="1.4" stroke-linejoin="round"`),
      poly([r0, e10, e11, r1], `fill="${roofDark}"`),
      poly([e00, r0, r1, e01], `fill="${roofLight}"`)
    ];
    if (snowCap) {
      const s0 = iso(um, v0 - 0.04, z1 + 0.04), s1 = iso(um, v1 + 0.04, z1 + 0.04);
      const l0 = iso(u0 - 0.04, v0 - 0.04, z0 - 0.01), l1 = iso(u0 - 0.04, v1 + 0.04, z0 - 0.01);
      const rr0 = iso(u1 + 0.04, v0 - 0.04, z0 + 0.02), rr1 = iso(u1 + 0.04, v1 + 0.04, z0 + 0.02);
      out.push(poly([s0, rr0, rr1, s1], 'fill="#d5e5f4"'));
      out.push(poly([l0, s0, s1, l1], 'fill="#f6fbff"'));
      out.push(`<path d="${pathPts([l0, l1], false)}" fill="none" stroke="#ffffff" stroke-width="${round1(pxTile * 0.05)}" stroke-linecap="round"/>`);
    }
    return out.join('');
  };

  const fencePost = (u, v, height = 0.32, col = '#734523', cap = true) => {
    const [bx, by] = iso(u, v, 0);
    const [tx, ty] = iso(u, v, height);
    const pw = Math.max(4, pxTile * 0.072);
    return [
      `<rect x="${round1(tx - pw / 2)}" y="${round1(ty)}" width="${round1(pw)}" height="${round1(by - ty)}" rx="${round1(pw * 0.35)}" fill="${col}" stroke="#4a2812" stroke-width="1"/>`,
      cap ? `<ellipse cx="${round1(tx)}" cy="${round1(ty)}" rx="${round1(pw * 0.65)}" ry="${round1(pw * 0.35)}" fill="#f3f8fe"/>` : ''
    ].join('');
  };

  const rail = (u0, v0, u1, v1, z, col = '#8c552b', w = 0.05) => {
    const [x0, y0] = iso(u0, v0, z), [x1, y1] = iso(u1, v1, z);
    return `<line x1="${round1(x0)}" y1="${round1(y0)}" x2="${round1(x1)}" y2="${round1(y1)}" stroke="${col}" stroke-width="${round1(pxTile * w)}" stroke-linecap="round"/>`;
  };

  const winGlow = (u, v, z, side = 'left', rw = 0.22, rh = 0.22) => {
    const du = side === 'right' ? 0 : rw;
    const dv = side === 'left' ? 0 : rw;
    const p0 = iso(u - du * 0.5, v - dv * 0.5, z + rh * 0.5);
    const p1 = iso(u + du * 0.5, v + dv * 0.5, z + rh * 0.5);
    const p2 = iso(u + du * 0.5, v + dv * 0.5, z - rh * 0.5);
    const p3 = iso(u - du * 0.5, v - dv * 0.5, z - rh * 0.5);
    return poly([p0, p1, p2, p3], 'fill="#ffe073" stroke="#5b3419" stroke-width="2" stroke-linejoin="round"');
  };

  const door = (u, v, z0, z1, rw = 0.24, side = 'left') => {
    const du = side === 'right' ? 0 : rw;
    const dv = side === 'left' ? 0 : rw;
    const p0 = iso(u - du * 0.5, v - dv * 0.5, z1);
    const p1 = iso(u + du * 0.5, v + dv * 0.5, z1);
    const p2 = iso(u + du * 0.5, v + dv * 0.5, z0);
    const p3 = iso(u - du * 0.5, v - dv * 0.5, z0);
    return poly([p0, p1, p2, p3], 'fill="#78421d" stroke="#4a260d" stroke-width="2" stroke-linejoin="round"');
  };

  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
    </defs>
    ${body}
  </svg>`;

  return { W, H, w, h, ht, pxTile, cx, cy, anchorY, iso, poly, pathPts, box, gableRoof, fencePost, rail, winGlow, door, wrap };
}

function drawBasePad(c, u0, v0, u1, v1, edgeCol, topCol) {
  return c.box(u0, v0, u1, v1, 0, 0.055, topCol, edgeCol, edgeCol);
}

function drawPenBase(c, padCol, padEdge, barnFn) {
  const hw = c.w / 2, hh = c.h / 2;
  const parts = [];
  const m = 0.03;
  // Flache, abgerundete, weich in die Wiese auslaufende Weidefläche (kein hartes aufgesetztes Brett)
  const [pTopX, pTopY] = c.iso(-hw + m, -hh + m, 0);
  const [pRightX, pRightY] = c.iso(hw - m, -hh + m, 0);
  const [pBotX, pBotY] = c.iso(hw - m, hh - m, 0);
  const [pLeftX, pLeftY] = c.iso(-hw + m, hh - m, 0);
  const padPath = `M ${round1(pTopX)} ${round1(pTopY)} L ${round1(pRightX)} ${round1(pRightY)} L ${round1(pBotX)} ${round1(pBotY)} L ${round1(pLeftX)} ${round1(pLeftY)} Z`;
  parts.push(`<path d="${padPath}" fill="${padEdge}" opacity="0.34" filter="url(#soft)"/>`);
  parts.push(`<path d="${padPath}" fill="${padCol}" stroke="${padEdge}" stroke-width="${round1(c.pxTile * 0.04)}" stroke-linejoin="round" opacity="0.92"/>`);
  // Dezente Stroh-/Erd-Sprenkel auf der Weide
  for (let i = 0; i < 14; i++) {
    const u = (((i * 37) % 100) / 100 - 0.5) * (c.w - 0.6);
    const v = (((i * 61 + 17) % 100) / 100 - 0.5) * (c.h - 0.6);
    const [sx, sy] = c.iso(u, v, 0.01);
    parts.push(`<ellipse cx="${round1(sx)}" cy="${round1(sy)}" rx="${round1(c.pxTile * 0.14)}" ry="${round1(c.pxTile * 0.06)}" fill="${i % 2 === 0 ? padEdge : '#e8d094'}" opacity="0.32"/>`);
  }
  const step = 0.75;
  for (let u = -hw + m; u <= hw - m + 0.01; u += step) parts.push(c.fencePost(u, -hh + m));
  for (let v = -hh + m; v <= hh - m + 0.01; v += step) parts.push(c.fencePost(-hw + m, v));
  parts.push(c.rail(-hw + m, -hh + m, hw - m, -hh + m, 0.24, '#8c5830'));
  parts.push(c.rail(-hw + m, -hh + m, hw - m, -hh + m, 0.12, '#734522'));
  parts.push(c.rail(-hw + m, -hh + m, -hw + m, hh - m, 0.24, '#a1693c'));
  parts.push(c.rail(-hw + m, -hh + m, -hw + m, hh - m, 0.12, '#83512a'));
  parts.push(barnFn());
  for (let u = -hw + m; u <= hw - m + 0.01; u += step) parts.push(c.fencePost(u, hh - m));
  for (let v = -hh + m; v <= hh - m + 0.01; v += step) parts.push(c.fencePost(hw - m, v));
  parts.push(c.rail(-hw + m, hh - m, hw - m, hh - m, 0.24, '#a86f40'));
  parts.push(c.rail(-hw + m, hh - m, hw - m, hh - m, 0.12, '#85532c'));
  parts.push(c.rail(hw - m, -hh + m, hw - m, hh - m, 0.24, '#804e28'));
  parts.push(c.rail(hw - m, -hh + m, hw - m, hh - m, 0.12, '#633a1c'));
  return parts.join('');
}

/** Weich gezeichnete, mehrstufige Alpentanne mit runden Ästen und lockeren Schneehauben. */
function drawPineTree(c, tiers = 4, trunkH = 0.14, radius = 0.44, topZ = c.ht * 0.90) {
  const parts = [];
  const [tx, ty] = c.iso(0, 0, 0);
  const [ttx, tty] = c.iso(0, 0, trunkH + 0.10);
  const tw = c.pxTile * 0.15;
  parts.push(`<ellipse cx="${round1(tx)}" cy="${round1(ty + 2)}" rx="${round1(c.pxTile * radius * 0.65)}" ry="${round1(c.pxTile * radius * 0.30)}" fill="#1f3827" opacity="0.28"/>`);
  parts.push(`<rect x="${round1(tx - tw / 2)}" y="${round1(tty)}" width="${round1(tw)}" height="${round1(ty - tty)}" rx="4" fill="#6b3e22"/>`);

  const baseZ = trunkH * 0.65;
  const span = topZ - baseZ;
  for (let i = 0; i < tiers; i++) {
    const f0 = i / tiers;
    const f1 = (i + 1.28) / tiers;
    const zBot = baseZ + span * f0 * 0.76;
    const zPeak = Math.min(topZ, baseZ + span * f1 * 0.88);
    const r = radius * (1 - f0 * 0.58) * c.pxTile;
    const [px, py] = c.iso(0, 0, zPeak);
    const [bx, by] = c.iso(0, 0, zBot);

    // Dunkle Unterschicht + weiche gebogene Ast-Lappen
    const dDark = `M ${round1(px)} ${round1(py)} C ${round1(px + r * 0.4)} ${round1(py + (by - py) * 0.45)}, ${round1(bx + r * 0.9)} ${round1(by - r * 0.05)}, ${round1(bx + r)} ${round1(by + r * 0.16)} Q ${round1(bx + r * 0.55)} ${round1(by + r * 0.44)} ${round1(bx)} ${round1(by + r * 0.38)} Q ${round1(bx - r * 0.55)} ${round1(by + r * 0.44)} ${round1(bx - r)} ${round1(by + r * 0.16)} C ${round1(bx - r * 0.9)} ${round1(by - r * 0.05)}, ${round1(px - r * 0.4)} ${round1(py + (by - py) * 0.45)}, ${round1(px)} ${round1(py)} Z`;
    parts.push(`<path d="${dDark}" fill="#1f5835"/>`);

    // Lichtseite (oben links) in warmem Tannengrün
    const dLight = `M ${round1(px)} ${round1(py)} C ${round1(px - r * 0.4)} ${round1(py + (by - py) * 0.45)}, ${round1(bx - r * 0.9)} ${round1(by - r * 0.05)}, ${round1(bx - r)} ${round1(by + r * 0.16)} Q ${round1(bx - r * 0.45)} ${round1(by + r * 0.40)} ${round1(bx + r * 0.08)} ${round1(by + r * 0.34)} Q ${round1(bx + r * 0.12)} ${round1(py + (by - py) * 0.55)} ${round1(px)} ${round1(py)} Z`;
    parts.push(`<path d="${dLight}" fill="${i % 2 === 0 ? '#2f7c4a' : '#378954'}"/>`);

    // Plusterige Schneehaube auf jedem Astkranz
    const sy = py + (by - py) * 0.48;
    const sPath = `M ${round1(px)} ${round1(py)} C ${round1(px + r * 0.25)} ${round1(py + (by - py) * 0.25)}, ${round1(bx + r * 0.56)} ${round1(sy - 4)}, ${round1(bx + r * 0.58)} ${round1(sy + 4)} Q ${round1(bx + r * 0.25)} ${round1(sy + 14)} ${round1(bx)} ${round1(sy + 7)} Q ${round1(bx - r * 0.32)} ${round1(sy + 16)} ${round1(bx - r * 0.68)} ${round1(sy + 3)} C ${round1(bx - r * 0.62)} ${round1(sy - 5)}, ${round1(px - r * 0.28)} ${round1(py + (by - py) * 0.24)}, ${round1(px)} ${round1(py)} Z`;
    parts.push(`<path d="${sPath}" fill="#edf6ff" opacity="0.96"/>`);
  }
  return parts.join('');
}

// ============================================================================
// Alle 25 Platzhalter + station_ribbon
// ============================================================================
const BUILDERS = {
  // ---------------- 6 Gebäude (2×2) ----------------
  farm_stand: () => {
    const c = makeCanvas('farmStand', 1.03);
    const [ax, ay] = c.iso(-0.1, 0.85, 0.65);
    const stripes = [];
    for (let i = 0; i < 6; i++) {
      const u0 = -0.82 + i * 0.27;
      const u1 = u0 + 0.27;
      const p0 = c.iso(u0, 0.30, 0.72), p1 = c.iso(u1, 0.30, 0.72);
      const p2 = c.iso(u1, 0.86, 0.50), p3 = c.iso(u0, 0.86, 0.50);
      stripes.push(c.poly([p0, p1, p2, p3], `fill="${i % 2 === 0 ? '#c92d34' : '#f8f2e8'}"`));
    }
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#6e4c30', '#a67b52'),
      c.box(-0.78, -0.76, 0.78, 0.32, 0.055, 0.62, '#c9884d', '#d99a5f', '#a66d3b', '#6e4220', 1.2),
      c.box(-0.76, 0.32, 0.76, 0.78, 0.055, 0.36, '#e2b17a', '#b87b44', '#945d2f', '#6e4220', 1.2),
      c.box(-0.55, 0.40, -0.22, 0.68, 0.36, 0.48, '#e33b3b', '#9e6232', '#7a4923'),
      c.box(-0.05, 0.40, 0.28, 0.68, 0.36, 0.48, '#f0b63d', '#9e6232', '#7a4923'),
      c.box(0.40, 0.40, 0.68, 0.68, 0.36, 0.48, '#66b53b', '#9e6232', '#7a4923'),
      c.fencePost(-0.74, 0.76, 0.54, '#6a3f1f', false),
      c.fencePost(0.74, 0.76, 0.54, '#593317', false),
      c.gableRoof(-0.88, -0.82, 0.88, 0.36, 0.62, 1.04, 'u', '#b84231', '#8f2e22', '#c88b52', true),
      stripes.join(''),
      `<circle cx="${round1(ax)}" cy="${round1(ay - 10)}" r="${round1(c.pxTile * 0.075)}" fill="#f5c644" stroke="#7d4a1d" stroke-width="2"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'farmStand' };
  },

  apple_stand: () => {
    const c = makeCanvas('apple_stand', 1.03);
    const [kx, ky] = c.iso(0.45, 0.56, 0.40);
    const [sx, sy] = c.iso(0, 0.76, 0.88);
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#6b4528', '#9c6e46'),
      c.box(-0.76, -0.72, 0.76, 0.60, 0.055, 0.62, '#c77f45', '#d99156', '#9e6232', '#6b401e', 1.2),
      c.winGlow(-0.34, 0.60, 0.36, 'left', 0.22, 0.22),
      `<ellipse cx="${round1(kx)}" cy="${round1(ky)}" rx="${round1(c.pxTile * 0.16)}" ry="${round1(c.pxTile * 0.11)}" fill="#c7652c" stroke="#6e3211" stroke-width="2"/>`,
      `<ellipse cx="${round1(kx)}" cy="${round1(ky - 4)}" rx="${round1(c.pxTile * 0.11)}" ry="${round1(c.pxTile * 0.055)}" fill="#e34434"/>`,
      c.box(-0.62, 0.35, 0.14, 0.72, 0.055, 0.36, '#d9382e', '#8f5629', '#6e3f1b'),
      c.gableRoof(-0.88, -0.80, 0.88, 0.74, 0.62, 1.12, 'u', '#cc352b', '#96221b', '#c27b43', true),
      `<circle cx="${round1(sx)}" cy="${round1(sy)}" r="${round1(c.pxTile * 0.14)}" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>`,
      `<circle cx="${round1(sx - 5)}" cy="${round1(sy - 5)}" r="${round1(c.pxTile * 0.04)}" fill="#fca5a5"/>`,
      `<ellipse cx="${round1(sx + 6)}" cy="${round1(sy - c.pxTile * 0.14)}" rx="${round1(c.pxTile * 0.055)}" ry="${round1(c.pxTile * 0.028)}" transform="rotate(-25 ${round1(sx + 6)} ${round1(sy - c.pxTile * 0.14)})" fill="#3a8c3a"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'apple_stand' };
  },

  almond_hut: () => {
    const c = makeCanvas('almond_hut', 1.03);
    const [px, py] = c.iso(-0.18, 0.65, 0.38);
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#694427', '#996a42'),
      c.box(-0.74, -0.72, 0.74, 0.56, 0.055, 0.64, '#d6b48a', '#ecd5b5', '#c4a67d', '#5c371c', 2.2),
      c.winGlow(-0.22, 0.56, 0.38, 'left', 0.24, 0.22),
      c.door(0.32, 0.56, 0.055, 0.44, 0.22, 'left'),
      `<ellipse cx="${round1(px)}" cy="${round1(py)}" rx="${round1(c.pxTile * 0.18)}" ry="${round1(c.pxTile * 0.10)}" fill="#3d3533" stroke="#1f1a19" stroke-width="2"/>`,
      `<ellipse cx="${round1(px)}" cy="${round1(py - 2)}" rx="${round1(c.pxTile * 0.13)}" ry="${round1(c.pxTile * 0.065)}" fill="#b45309"/>`,
      c.gableRoof(-0.88, -0.80, 0.88, 0.66, 0.64, 1.14, 'v', '#8c4b23', '#693414', '#d9be98', true),
      c.box(-0.16, 0.58, 0.16, 0.68, 0.74, 1.04, '#f59e0b', '#d97706', '#b45309')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'almond_hut' };
  },

  wreath_shop: () => {
    const c = makeCanvas('wreath_shop', 1.03);
    const [wx, wy] = c.iso(0, 0.72, 0.94);
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#5e432a', '#8f6945'),
      c.box(-0.76, -0.72, 0.76, 0.62, 0.055, 0.66, '#c78c54', '#dea66d', '#ad723d', '#5e3b1e', 1.2),
      c.winGlow(-0.34, 0.62, 0.36, 'left', 0.22, 0.22),
      c.winGlow(0.34, 0.62, 0.36, 'left', 0.22, 0.22),
      c.door(0, 0.62, 0.055, 0.45, 0.22, 'left'),
      c.gableRoof(-0.88, -0.80, 0.88, 0.74, 0.66, 1.28, 'u', '#2c6b3f', '#1e4d2c', '#cfa170', true),
      `<circle cx="${round1(wx)}" cy="${round1(wy)}" r="${round1(c.pxTile * 0.20)}" fill="none" stroke="#225f33" stroke-width="${round1(c.pxTile * 0.10)}"/>`,
      `<circle cx="${round1(wx - 9)}" cy="${round1(wy - 9)}" r="4" fill="#dc2626"/>`,
      `<circle cx="${round1(wx + 11)}" cy="${round1(wy - 6)}" r="4" fill="#fbbf24"/>`,
      `<circle cx="${round1(wx)}" cy="${round1(wy + 11)}" r="4.5" fill="#dc2626"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'wreath_shop' };
  },

  wichtel_post: () => {
    const c = makeCanvas('wichtel_post', 1.03);
    const [bx, by] = c.iso(0.68, 0.74, 0.28);
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#5a3f28', '#8c6644'),
      c.box(-0.76, -0.72, 0.76, 0.62, 0.055, 0.70, '#c83b36', '#d94d47', '#a12a26', '#691c18', 1.2),
      c.winGlow(-0.28, 0.62, 0.40, 'left', 0.22, 0.22),
      c.door(0.22, 0.62, 0.055, 0.46, 0.24, 'left'),
      c.box(0.50, 0.55, 0.82, 0.82, 0.055, 0.30, '#fde68a', '#f59e0b', '#d97706'),
      `<circle cx="${round1(bx)}" cy="${round1(by)}" r="4.5" fill="#dc2626"/>`,
      c.gableRoof(-0.88, -0.80, 0.88, 0.74, 0.70, 1.24, 'u', '#8c2d2d', '#631d1d', '#f2cf7c', true),
      c.box(-0.20, -0.20, 0.20, 0.20, 1.12, 1.44, '#fbbf24', '#d97706', '#b45309')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'wichtel_post' };
  },

  toy_workshop: () => {
    const c = makeCanvas('toy_workshop', 1.03);
    const [hx, hy] = c.iso(0, 0.76, 0.98);
    const body = [
      drawBasePad(c, -0.97, -0.97, 0.97, 0.97, '#5c3c24', '#8e623f'),
      c.box(-0.78, -0.72, 0.78, 0.62, 0.055, 0.74, '#2f5f9e', '#3c74bd', '#224778', '#172e4f', 1.2),
      c.winGlow(-0.36, 0.62, 0.42, 'left', 0.22, 0.22),
      c.winGlow(0.36, 0.62, 0.42, 'left', 0.22, 0.22),
      c.door(0, 0.62, 0.055, 0.46, 0.24, 'left'),
      c.box(-0.78, 0.64, -0.45, 0.88, 0.055, 0.30, '#ef4444', '#dc2626', '#991b1b'),
      c.box(0.45, 0.64, 0.78, 0.88, 0.055, 0.30, '#fbbf24', '#d97706', '#b45309'),
      c.gableRoof(-0.90, -0.82, 0.90, 0.74, 0.74, 1.40, 'u', '#b8322b', '#87211c', '#e6b873', true),
      `<circle cx="${round1(hx)}" cy="${round1(hy)}" r="${round1(c.pxTile * 0.15)}" fill="#fef3c7" stroke="#b45309" stroke-width="2.5"/>`,
      `<circle cx="${round1(hx)}" cy="${round1(hy)}" r="${round1(c.pxTile * 0.075)}" fill="#dc2626"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'toy_workshop' };
  },

  // ---------------- 5 Gehege (3×3 und 4×4 – Dächer komplett sichtbar!) ----------------
  pen_chicken: () => {
    const c = makeCanvas('chicken_pen', 1.02);
    const body = drawPenBase(c, '#d8b46c', '#9c7838', () => [
      // Gemütlicher kleiner roter Hühnerstall hinten (z0=0.40, z1=0.72 → 0% Beschnitt!)
      c.box(-1.25, -1.25, -0.15, -0.30, 0.055, 0.40, '#c8453a', '#d6554a', '#a1332b', '#75211a', 1.2),
      c.door(-0.70, -0.30, 0.055, 0.28, 0.24, 'left'),
      c.gableRoof(-1.34, -1.34, -0.06, -0.22, 0.40, 0.72, 'u', '#8b4524', '#632e16', '#e6caa3', true),
      c.box(0.25, -1.15, 0.75, -0.75, 0.055, 0.22, '#e6c27a', '#b58445', '#8f622c')
    ].join(''));
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'chicken_pen' };
  },

  pen_owl: () => {
    const c = makeCanvas('owl_pen', 1.02);
    const body = drawPenBase(c, '#c4b89a', '#85785d', () => [
      c.box(-1.12, -1.12, -0.20, -0.20, 0.055, 0.50, '#7c5333', '#966842', '#664124', '#4a2e18', 1.2),
      c.winGlow(-0.66, -0.20, 0.30, 'left', 0.20, 0.18),
      c.gableRoof(-1.24, -1.24, -0.08, -0.08, 0.50, 0.80, 'v', '#3d5a73', '#2a4052', '#a87c52', true),
      c.fencePost(0.35, -0.85, 0.55, '#5a3b22', true)
    ].join(''));
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'owl_pen' };
  },

  pen_sheep: () => {
    const c = makeCanvas('sheep_pen', 1.02);
    const body = drawPenBase(c, '#c9b37c', '#8c7644', () => [
      c.box(-1.68, -1.68, -0.35, -0.48, 0.055, 0.46, '#8c623d', '#a6774d', '#734d2c', '#4d321c', 1.2),
      c.door(-1.02, -0.48, 0.055, 0.34, 0.36, 'left'),
      c.gableRoof(-1.78, -1.78, -0.24, -0.36, 0.46, 0.84, 'u', '#734828', '#543219', '#d4b483', true),
      c.box(0.20, -1.48, 0.84, -0.94, 0.055, 0.36, '#f0c756', '#d6a938', '#ad8321')
    ].join(''));
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'sheep_pen' };
  },

  pen_reindeer: () => {
    const c = makeCanvas('reindeer_pen', 1.02);
    const body = drawPenBase(c, '#cdb68b', '#8c754d', () => [
      c.box(-1.68, -1.68, -0.28, -0.44, 0.055, 0.50, '#a8342d', '#bf4139', '#82231e', '#591512', 1.2),
      c.winGlow(-0.98, -0.44, 0.30, 'left', 0.24, 0.18),
      c.gableRoof(-1.78, -1.78, -0.18, -0.34, 0.50, 0.86, 'u', '#4d3221', '#362115', '#e3c07d', true),
      c.box(0.32, -1.45, 1.02, -0.90, 0.055, 0.34, '#d97706', '#92400e', '#78350f')
    ].join(''));
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'reindeer_pen' };
  },

  pen_donkey: () => {
    const c = makeCanvas('donkey_pen', 1.02);
    const body = drawPenBase(c, '#c4a97d', '#876f49', () => [
      c.box(-1.68, -1.68, -0.32, -0.48, 0.055, 0.48, '#7a5233', '#946642', '#613e23', '#422916', 1.2),
      c.door(-1.00, -0.48, 0.055, 0.34, 0.36, 'left'),
      c.gableRoof(-1.78, -1.78, -0.20, -0.36, 0.48, 0.84, 'v', '#5b4b3e', '#40342a', '#b88f64', true),
      c.box(0.28, -1.50, 0.92, -0.96, 0.055, 0.38, '#a16236', '#784420', '#593014')
    ].join(''));
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'donkey_pen' };
  },

  // ---------------- 8 Dekorationen (inkl. sauber proportionierter Dorf-Laterne 1,4 Kacheln) ----------------
  deco_lantern: () => {
    const c = makeCanvas('lantern', 0.72, 0.92);
    const [bx, by] = c.iso(0.08, 0.04, 0);
    const [px, py] = c.iso(0.08, 0.04, 1.06);
    const [armX, armY] = c.iso(-0.18, 0.04, 1.18);
    const [lx, ly] = c.iso(-0.18, 0.04, 0.96);
    const pw = c.pxTile * 0.055;
    const lw = c.pxTile * 0.13;
    const lh = c.pxTile * 0.19;
    const body = [
      // Kleiner runder Steinfuß am Boden
      `<ellipse cx="${round1(bx)}" cy="${round1(by + 2)}" rx="${round1(c.pxTile * 0.13)}" ry="${round1(c.pxTile * 0.065)}" fill="#64748b"/>`,
      `<ellipse cx="${round1(bx)}" cy="${round1(by - 2)}" rx="${round1(c.pxTile * 0.10)}" ry="${round1(c.pxTile * 0.05)}" fill="#94a3b8"/>`,
      // Schmiedeeiserner Mast (klar höher als eine 0,8-Person!)
      `<rect x="${round1(px - pw / 2)}" y="${round1(py)}" width="${round1(pw)}" height="${round1(by - py)}" rx="3" fill="#2d343d" stroke="#181c22" stroke-width="1"/>`,
      // Geschwungener Ausleger oben
      `<path d="M ${round1(px)} ${round1(py + 6)} C ${round1(px)} ${round1(py - c.pxTile * 0.22)}, ${round1(armX)} ${round1(py - c.pxTile * 0.22)}, ${round1(armX)} ${round1(armY - c.pxTile * 0.06)}" fill="none" stroke="#2d343d" stroke-width="${round1(pw * 0.9)}" stroke-linecap="round"/>`,
      `<path d="M ${round1(px)} ${round1(py + c.pxTile * 0.14)} Q ${round1((px + armX) / 2)} ${round1(py + c.pxTile * 0.02)} ${round1(armX + lw * 0.25)} ${round1(armY - c.pxTile * 0.04)}" fill="none" stroke="#475569" stroke-width="${round1(pw * 0.55)}" stroke-linecap="round"/>`,
      // Tannenzweig + kleine rote Schleife am oberen Mast
      `<path d="M ${round1(px + 2)} ${round1(py + c.pxTile * 0.24)} L ${round1(px + c.pxTile * 0.12)} ${round1(py + c.pxTile * 0.14)}" stroke="#166534" stroke-width="5" stroke-linecap="round"/>`,
      `<circle cx="${round1(px)}" cy="${round1(py + c.pxTile * 0.25)}" r="5" fill="#dc2626"/>`,
      `<ellipse cx="${round1(px - 6)}" cy="${round1(py + c.pxTile * 0.26)}" rx="5" ry="3.5" fill="#ef4444"/>`,
      `<ellipse cx="${round1(px + 6)}" cy="${round1(py + c.pxTile * 0.26)}" rx="5" ry="3.5" fill="#b91c1c"/>`,
      // Warmer Lichtschein + feiner proportionierter Laternenkopf (über Kopfhöhe)
      `<circle cx="${round1(lx)}" cy="${round1(ly)}" r="${round1(lw * 1.45)}" fill="#fde047" opacity="0.22" filter="url(#soft)"/>`,
      `<polygon points="${round1(lx - lw * 0.72)},${round1(ly - lh * 0.35)} ${round1(lx + lw * 0.72)},${round1(ly - lh * 0.35)} ${round1(lx + lw * 0.52)},${round1(ly + lh * 0.45)} ${round1(lx - lw * 0.52)},${round1(ly + lh * 0.45)}" fill="#fcd34d" stroke="#2d343d" stroke-width="2.2" stroke-linejoin="round"/>`,
      `<ellipse cx="${round1(lx)}" cy="${round1(ly)}" rx="${round1(lw * 0.34)}" ry="${round1(lh * 0.28)}" fill="#fef9c3"/>`,
      // Kleines Laternen-Dach mit Schneehaube
      `<polygon points="${round1(lx)},${round1(ly - lh * 0.72)} ${round1(lx + lw * 0.92)},${round1(ly - lh * 0.32)} ${round1(lx - lw * 0.92)},${round1(ly - lh * 0.32)}" fill="#374151" stroke="#1f2937" stroke-width="1.5" stroke-linejoin="round"/>`,
      `<path d="M ${round1(lx)} ${round1(ly - lh * 0.74)} Q ${round1(lx + lw * 0.85)} ${round1(ly - lh * 0.48)} ${round1(lx + lw * 0.90)} ${round1(ly - lh * 0.34)} Q ${round1(lx)} ${round1(ly - lh * 0.22)} ${round1(lx - lw * 0.90)} ${round1(ly - lh * 0.34)} Q ${round1(lx - lw * 0.85)} ${round1(ly - lh * 0.48)} ${round1(lx)} ${round1(ly - lh * 0.74)} Z" fill="#f1f7fe"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'lantern' };
  },

  deco_pine_large: () => {
    const c = makeCanvas('pine_large', 0.92, 0.87);
    return { svg: c.wrap(drawPineTree(c, 5, 0.22, 0.78, 2.00)), anchorY: c.anchorY, size: 'pine_large' };
  },

  deco_giftpile: () => {
    const c = makeCanvas('giftpile', 1.02, 0.64);
    const body = [
      c.box(-0.36, -0.32, 0.16, 0.24, 0, 0.32, '#e03b3b', '#c42727', '#961919'),
      c.box(-0.14, -0.34, -0.06, 0.25, 0.32, 0.34, '#fbbf24', '#d97706', '#b45309'),
      c.box(0.06, -0.14, 0.42, 0.38, 0, 0.24, '#38bdf8', '#0284c7', '#0369a1'),
      c.box(-0.24, 0.06, 0.22, 0.44, 0, 0.22, '#4ade80', '#16a34a', '#15803d'),
      c.box(-0.18, -0.18, 0.08, 0.08, 0.32, 0.52, '#fbbf24', '#f59e0b', '#d97706')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'giftpile' };
  },

  deco_light_reindeer: () => {
    const c = makeCanvas('light_reindeer', 1.02, 0.81);
    const [bx, by] = c.iso(0, 0, 0.34);
    const [hx, hy] = c.iso(0.24, -0.10, 0.60);
    const [fx1, fy1] = c.iso(0.18, 0.16, 0.05);
    const [fx2, fy2] = c.iso(-0.18, 0.16, 0.05);
    const [fx3, fy3] = c.iso(0.18, -0.16, 0.05);
    const [fx4, fy4] = c.iso(-0.18, -0.16, 0.05);
    const body = [
      c.box(-0.32, -0.26, 0.32, 0.26, 0, 0.06, '#e5f0fa', '#b6cce0', '#96b0c7'),
      `<g stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none">
        <line x1="${round1(bx)}" y1="${round1(by)}" x2="${round1(fx1)}" y2="${round1(fy1)}"/>
        <line x1="${round1(bx)}" y1="${round1(by)}" x2="${round1(fx2)}" y2="${round1(fy2)}"/>
        <line x1="${round1(bx)}" y1="${round1(by)}" x2="${round1(fx3)}" y2="${round1(fy3)}"/>
        <line x1="${round1(bx)}" y1="${round1(by)}" x2="${round1(fx4)}" y2="${round1(fy4)}"/>
      </g>`,
      `<ellipse cx="${round1(bx)}" cy="${round1(by)}" rx="${round1(c.pxTile * 0.22)}" ry="${round1(c.pxTile * 0.12)}" fill="#fef08a" stroke="#f59e0b" stroke-width="3"/>`,
      `<line x1="${round1(bx + 8)}" y1="${round1(by - 4)}" x2="${round1(hx)}" y2="${round1(hy)}" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>`,
      `<circle cx="${round1(hx)}" cy="${round1(hy)}" r="${round1(c.pxTile * 0.10)}" fill="#fde68a" stroke="#f59e0b" stroke-width="3"/>`,
      `<path d="M ${round1(hx - 4)} ${round1(hy - 8)} L ${round1(hx - 14)} ${round1(hy - 24)} M ${round1(hx + 3)} ${round1(hy - 9)} L ${round1(hx + 11)} ${round1(hy - 25)}" stroke="#fef08a" stroke-width="3" stroke-linecap="round"/>`,
      `<circle cx="${round1(hx + 8)}" cy="${round1(hy + 2)}" r="4" fill="#ef4444"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'light_reindeer' };
  },

  deco_big_nutcracker: () => {
    const c = makeCanvas('big_nutcracker', 0.90, 0.87);
    const [hx, hy] = c.iso(0, 0, 0.96);
    const body = [
      c.box(-0.34, -0.34, 0.34, 0.34, 0, 0.13, '#b91c1c', '#991b1b', '#7f1d1d'),
      c.box(-0.18, -0.18, -0.02, 0.18, 0.13, 0.48, '#1e293b', '#334155', '#0f172a'),
      c.box(0.02, -0.18, 0.18, 0.18, 0.13, 0.48, '#1e293b', '#334155', '#0f172a'),
      c.box(-0.24, -0.20, 0.24, 0.20, 0.48, 0.86, '#dc2626', '#ef4444', '#b91c1c'),
      c.box(-0.25, -0.21, 0.25, 0.21, 0.48, 0.56, '#fbbf24', '#f59e0b', '#d97706'),
      `<circle cx="${round1(hx)}" cy="${round1(hy)}" r="${round1(c.pxTile * 0.15)}" fill="#fde2c4" stroke="#b45309" stroke-width="1.5"/>`,
      `<path d="M ${round1(hx - 14)} ${round1(hy + 5)} Q ${round1(hx)} ${round1(hy + 13)} ${round1(hx + 14)} ${round1(hy + 5)}" fill="#ffffff"/>`,
      c.box(-0.18, -0.18, 0.18, 0.18, 1.08, 1.32, '#1e3a8a', '#1d4ed8', '#172554')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'big_nutcracker' };
  },

  deco_bench: () => {
    const c = makeCanvas('bench', 1.02, 0.58);
    const [lx, ly] = c.iso(0.68, 0.05, 0.36);
    const body = [
      c.box(-0.80, -0.32, -0.64, 0.32, 0, 0.22, '#5c361a', '#6e4221', '#4a2a13'),
      c.box(0.64, -0.32, 0.80, 0.32, 0, 0.22, '#5c361a', '#6e4221', '#4a2a13'),
      c.box(-0.84, -0.34, 0.84, 0.34, 0.18, 0.25, '#b5723c', '#945a2b', '#75441d'),
      c.box(-0.38, -0.35, 0.26, 0.35, 0.25, 0.29, '#c92d34', '#9e1f26', '#7d161c'),
      c.box(-0.84, -0.34, 0.84, -0.20, 0.25, 0.48, '#c78146', '#a86934', '#824e23'),
      c.box(-0.84, -0.34, 0.84, -0.20, 0.48, 0.53, '#f4f9ff', '#d6e6f5', '#b9cee0'),
      `<circle cx="${round1(lx)}" cy="${round1(ly)}" r="${round1(c.pxTile * 0.07)}" fill="#fde047" stroke="#78350f" stroke-width="2"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'bench' };
  },

  deco_lightarch: () => {
    const c = makeCanvas('lightarch', 1.02, 0.78);
    const [ax0, ay0] = c.iso(-0.74, 0, 0.84);
    const [ax1, ay1] = c.iso(0.74, 0, 0.84);
    const [topX, topY] = c.iso(0, 0, 1.32);
    const bulbs = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const bx = (1 - t) * (1 - t) * ax0 + 2 * (1 - t) * t * topX + t * t * ax1;
      const by = (1 - t) * (1 - t) * ay0 + 2 * (1 - t) * t * (topY - c.pxTile * 0.14) + t * t * ay1;
      bulbs.push(`<circle cx="${round1(bx)}" cy="${round1(by)}" r="5" fill="#fef08a" stroke="#f59e0b" stroke-width="1.5"/>`);
    }
    const body = [
      c.box(-0.88, -0.32, -0.60, 0.32, 0, 0.84, '#5a3a22', '#70492b', '#472d19'),
      c.box(0.60, -0.32, 0.88, 0.32, 0, 0.84, '#5a3a22', '#70492b', '#472d19'),
      `<path d="M ${round1(ax0)} ${round1(ay0)} Q ${round1(topX)} ${round1(topY - c.pxTile * 0.20)} ${round1(ax1)} ${round1(ay1)}" fill="none" stroke="#1e5932" stroke-width="${round1(c.pxTile * 0.24)}" stroke-linecap="round"/>`,
      `<path d="M ${round1(ax0)} ${round1(ay0 - 4)} Q ${round1(topX)} ${round1(topY - c.pxTile * 0.24)} ${round1(ax1)} ${round1(ay1 - 4)}" fill="none" stroke="#2d7a47" stroke-width="${round1(c.pxTile * 0.14)}" stroke-linecap="round"/>`,
      bulbs.join('')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'lightarch' };
  },

  deco_gingerbread_gate: () => {
    const c = makeCanvas('gingerbread_gate', 1.02, 0.79);
    const body = [
      c.box(-0.88, -0.34, -0.42, 0.34, 0, 1.18, '#a66232', '#bf753f', '#874c22'),
      c.box(0.42, -0.34, 0.88, 0.34, 0, 1.18, '#a66232', '#bf753f', '#874c22'),
      c.gableRoof(-0.92, -0.38, -0.38, 0.38, 1.18, 1.44, 'u', '#f8fafc', '#e2e8f0', '#b56e3a', false),
      c.gableRoof(0.38, -0.38, 0.92, 0.38, 1.18, 1.44, 'u', '#f8fafc', '#e2e8f0', '#b56e3a', false),
      c.box(-0.55, -0.26, 0.55, 0.26, 0.90, 1.24, '#f8fafc', '#b56e3a', '#8f5226'),
      c.box(-0.74, 0.26, -0.56, 0.38, 0.15, 0.84, '#ef4444', '#dc2626', '#991b1b'),
      c.box(0.56, 0.26, 0.74, 0.38, 0.15, 0.84, '#ef4444', '#dc2626', '#991b1b')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'gingerbread_gate' };
  },

  // ---------------- 7 Hindernisse (weich, natürlich & alpenwinterlich) ----------------
  obs_drift_small: () => {
    const c = makeCanvas('drift_small', 1.04, 0.74);
    const pL = c.iso(-0.46, 0.16, 0.02), pR = c.iso(0.46, 0.02, 0.02);
    const pF = c.iso(0.12, 0.45, 0.02), pT = c.iso(-0.08, -0.10, 0.34);
    const d = `M ${round1(pL[0])} ${round1(pL[1])} C ${round1(pL[0] + 12)} ${round1(pT[1] - 4)}, ${round1(pT[0] + 24)} ${round1(pT[1] - 6)}, ${round1(pR[0])} ${round1(pR[1])} C ${round1(pR[0] - 8)} ${round1(pF[1] + 2)}, ${round1(pF[0] + 10)} ${round1(pF[1] + 5)}, ${round1(pF[0])} ${round1(pF[1])} C ${round1(pL[0] + 12)} ${round1(pF[1] - 2)}, ${round1(pL[0] - 4)} ${round1(pL[1] + 8)}, ${round1(pL[0])} ${round1(pL[1])} Z`;
    const hi = `M ${round1(pL[0] + 8)} ${round1(pL[1] - 3)} C ${round1(pT[0] - 12)} ${round1(pT[1])}, ${round1(pT[0] + 18)} ${round1(pT[1])}, ${round1(pR[0] - 12)} ${round1(pR[1] - 5)} Q ${round1(pT[0] + 4)} ${round1(pT[1] + 12)} ${round1(pL[0] + 8)} ${round1(pL[1] - 3)} Z`;
    const body = [
      `<path d="${d}" fill="#c6dbed"/>`,
      `<path d="${hi}" fill="#f6fbff"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'drift_small' };
  },

  obs_drift_large: () => {
    const c = makeCanvas('drift_large', 1.04, 0.72);
    const pL = c.iso(-0.92, 0.32, 0.02), pR = c.iso(0.92, 0.02, 0.02);
    const pF = c.iso(0.24, 0.92, 0.02), pT1 = c.iso(-0.22, -0.18, 0.68), pT2 = c.iso(0.32, 0.04, 0.52);
    const d = `M ${round1(pL[0])} ${round1(pL[1])} C ${round1(pL[0] + 30)} ${round1(pT1[1] - 12)}, ${round1(pT2[0] + 30)} ${round1(pT2[1] - 6)}, ${round1(pR[0])} ${round1(pR[1])} C ${round1(pR[0] - 12)} ${round1(pF[1] + 4)}, ${round1(pF[0] + 20)} ${round1(pF[1] + 8)}, ${round1(pF[0])} ${round1(pF[1])} C ${round1(pL[0] + 24)} ${round1(pF[1] - 4)}, ${round1(pL[0] - 8)} ${round1(pL[1] + 12)}, ${round1(pL[0])} ${round1(pL[1])} Z`;
    const hi = `M ${round1(pL[0] + 16)} ${round1(pL[1] - 8)} Q ${round1(pT1[0] + 4)} ${round1(pT1[1])} ${round1(pT2[0])} ${round1(pT2[1] + 2)} Q ${round1(pT1[0] + 10)} ${round1(pT1[1] + 26)} ${round1(pL[0] + 16)} ${round1(pL[1] - 8)} Z`;
    const body = [
      `<path d="${d}" fill="#c5daec"/>`,
      `<path d="${hi}" fill="#f7fbff"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'drift_large' };
  },

  obs_rock_small: () => {
    const c = makeCanvas('rock_small', 1.04, 0.78);
    const [bx, by] = c.iso(0, 0.12, 0.02);
    const [sx, sy] = c.iso(0.24, 0.20, 0.06);
    const rx = c.pxTile * 0.34, ry = c.pxTile * 0.22;
    const body = [
      // Weicher runder Hauptfels + kleiner Begleitstein
      `<path d="M ${round1(bx - rx)} ${round1(by + 4)} C ${round1(bx - rx)} ${round1(by - ry * 1.6)}, ${round1(bx + rx * 0.8)} ${round1(by - ry * 1.5)}, ${round1(bx + rx)} ${round1(by + 4)} Q ${round1(bx)} ${round1(by + ry * 0.65)} ${round1(bx - rx)} ${round1(by + 4)} Z" fill="#6f7c88"/>`,
      `<path d="M ${round1(bx - rx * 0.92)} ${round1(by)} C ${round1(bx - rx * 0.85)} ${round1(by - ry * 1.45)}, ${round1(bx + rx * 0.3)} ${round1(by - ry * 1.35)}, ${round1(bx + rx * 0.25)} ${round1(by + ry * 0.25)} Q ${round1(bx - rx * 0.4)} ${round1(by + ry * 0.45)} ${round1(bx - rx * 0.92)} ${round1(by)} Z" fill="#8b98a6"/>`,
      `<path d="M ${round1(bx - rx * 0.68)} ${round1(by - ry * 0.72)} C ${round1(bx - rx * 0.4)} ${round1(by - ry * 1.55)}, ${round1(bx + rx * 0.58)} ${round1(by - ry * 1.45)}, ${round1(bx + rx * 0.72)} ${round1(by - ry * 0.62)} Q ${round1(bx)} ${round1(by - ry * 0.40)} ${round1(bx - rx * 0.68)} ${round1(by - ry * 0.72)} Z" fill="#f1f7fe"/>`,
      `<ellipse cx="${round1(sx)}" cy="${round1(sy)}" rx="${round1(c.pxTile * 0.14)}" ry="${round1(c.pxTile * 0.10)}" fill="#65717d"/>`,
      `<ellipse cx="${round1(sx - 2)}" cy="${round1(sy - 3)}" rx="${round1(c.pxTile * 0.11)}" ry="${round1(c.pxTile * 0.06)}" fill="#eef6ff"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'rock_small' };
  },

  obs_rock_large: () => {
    const c = makeCanvas('rock_large', 1.04, 0.76);
    const [bx, by] = c.iso(-0.08, 0.15, 0.02);
    const [sx, sy] = c.iso(0.45, 0.36, 0.06);
    const rx = c.pxTile * 0.68, ry = c.pxTile * 0.42;
    const body = [
      `<path d="M ${round1(bx - rx)} ${round1(by + 8)} C ${round1(bx - rx * 0.95)} ${round1(by - ry * 1.65)}, ${round1(bx + rx * 0.85)} ${round1(by - ry * 1.55)}, ${round1(bx + rx)} ${round1(by + 8)} Q ${round1(bx)} ${round1(by + ry * 0.68)} ${round1(bx - rx)} ${round1(by + 8)} Z" fill="#687582"/>`,
      `<path d="M ${round1(bx - rx * 0.90)} ${round1(by + 2)} C ${round1(bx - rx * 0.85)} ${round1(by - ry * 1.45)}, ${round1(bx + rx * 0.25)} ${round1(by - ry * 1.40)}, ${round1(bx + rx * 0.20)} ${round1(by + ry * 0.30)} Q ${round1(bx - rx * 0.4)} ${round1(by + ry * 0.48)} ${round1(bx - rx * 0.90)} ${round1(by + 2)} Z" fill="#8794a3"/>`,
      `<path d="M ${round1(bx - rx * 0.66)} ${round1(by - ry * 0.72)} C ${round1(bx - rx * 0.35)} ${round1(by - ry * 1.62)}, ${round1(bx + rx * 0.56)} ${round1(by - ry * 1.48)}, ${round1(bx + rx * 0.70)} ${round1(by - ry * 0.64)} Q ${round1(bx)} ${round1(by - ry * 0.40)} ${round1(bx - rx * 0.66)} ${round1(by - ry * 0.72)} Z" fill="#f3f8ff"/>`,
      `<ellipse cx="${round1(sx)}" cy="${round1(sy)}" rx="${round1(c.pxTile * 0.26)}" ry="${round1(c.pxTile * 0.16)}" fill="#5f6b77"/>`,
      `<ellipse cx="${round1(sx - 4)}" cy="${round1(sy - 6)}" rx="${round1(c.pxTile * 0.19)}" ry="${round1(c.pxTile * 0.09)}" fill="#eef6ff"/>`
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'rock_large' };
  },

  obs_ice_small: () => {
    const c = makeCanvas('ice_small', 1.04, 0.78);
    const body = [
      // Facettierte Scholle ohne harten Würfelkasten
      c.poly([c.iso(-0.42, 0.08, 0.02), c.iso(0.06, 0.44, 0.02), c.iso(0.44, -0.02, 0.02), c.iso(-0.02, -0.40, 0.02)], 'fill="#7dd3fc" stroke="#38bdf8" stroke-width="1.5" stroke-linejoin="round"'),
      c.poly([c.iso(-0.28, 0.04, 0.05), c.iso(0.04, 0.24, 0.05), c.iso(-0.06, -0.08, 0.38)], 'fill="#bae6fd"'),
      c.poly([c.iso(0.04, 0.24, 0.05), c.iso(0.24, -0.04, 0.05), c.iso(-0.06, -0.08, 0.38)], 'fill="#38bdf8"'),
      c.poly([c.iso(-0.28, 0.04, 0.05), c.iso(-0.04, -0.22, 0.05), c.iso(-0.06, -0.08, 0.38)], 'fill="#f0f9ff"')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'ice_small' };
  },

  obs_ice_large: () => {
    const c = makeCanvas('ice_large', 1.04, 0.76);
    const body = [
      c.poly([c.iso(-0.88, 0.14, 0.02), c.iso(0.12, 0.90, 0.02), c.iso(0.88, -0.08, 0.02), c.iso(-0.08, -0.84, 0.02)], 'fill="#7dd3fc" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"'),
      c.poly([c.iso(-0.56, 0.16, 0.08), c.iso(0.06, 0.48, 0.08), c.iso(-0.14, -0.14, 0.76)], 'fill="#bae6fd"'),
      c.poly([c.iso(0.06, 0.48, 0.08), c.iso(0.56, -0.12, 0.08), c.iso(-0.14, -0.14, 0.76)], 'fill="#38bdf8"'),
      c.poly([c.iso(-0.56, 0.16, 0.08), c.iso(-0.10, -0.54, 0.08), c.iso(-0.14, -0.14, 0.76)], 'fill="#f0f9ff"'),
      c.poly([c.iso(0.16, 0.12, 0.08), c.iso(0.64, 0.22, 0.08), c.iso(0.36, -0.04, 0.58)], 'fill="#bae6fd"')
    ].join('');
    return { svg: c.wrap(body), anchorY: c.anchorY, size: 'ice_large' };
  },

  obs_pine_small: () => {
    const c = makeCanvas('pine_small', 0.96, 0.86);
    return { svg: c.wrap(drawPineTree(c, 4, 0.14, 0.44, 1.08)), anchorY: c.anchorY, size: 'pine_small' };
  },

  // ---------------- 2 fehlende Tier-Platzhalter (Baustein 11) ----------------
  animal_owl: () => {
    const W = 148, H = 160;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <radialGradient id="owlBody" cx="42%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="72%" stop-color="#e8eff7"/>
          <stop offset="100%" stop-color="#c3d2e2"/>
        </radialGradient>
        <linearGradient id="owlScarf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#b91c1c"/>
        </linearGradient>
      </defs>
      <!-- Flauschiger Schwanz hinten links -->
      <path d="M24 106 Q10 120 26 134 L48 124 Z" fill="#b8cadc" stroke="#687d94" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Runder Schneeeulen-Körper -->
      <ellipse cx="74" cy="94" rx="46" ry="52" fill="url(#owlBody)" stroke="#6c8096" stroke-width="3"/>
      <!-- Flügel rechts & links -->
      <path d="M32 76 C22 96, 26 124, 46 130 C52 114, 52 92, 42 74 Z" fill="#dce7f2" stroke="#7d91a8" stroke-width="2.2"/>
      <path d="M114 78 C126 98, 122 126, 102 132 C98 114, 98 92, 106 76 Z" fill="#d0dfee" stroke="#7d91a8" stroke-width="2.2"/>
      <!-- Dezente Winter-Sprenkel auf Bauch & Flügel -->
      <ellipse cx="64" cy="112" rx="4.5" ry="2.6" fill="#9fb2c7"/>
      <ellipse cx="82" cy="116" rx="4.5" ry="2.6" fill="#9fb2c7"/>
      <ellipse cx="73" cy="124" rx="4.5" ry="2.6" fill="#9fb2c7"/>
      <!-- Runder Kopf mit Feder-Öhrchen -->
      <path d="M38 36 L30 16 L54 28 Z" fill="#e5eef7" stroke="#6c8096" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M110 36 L118 16 L94 28 Z" fill="#dce7f2" stroke="#6c8096" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="76" cy="48" rx="40" ry="34" fill="url(#owlBody)" stroke="#6c8096" stroke-width="3"/>
      <!-- Gesichtsschleier -->
      <ellipse cx="62" cy="48" rx="14" ry="13" fill="#ffffff" stroke="#b9cadb" stroke-width="2"/>
      <ellipse cx="92" cy="48" rx="14" ry="13" fill="#ffffff" stroke="#b9cadb" stroke-width="2"/>
      <!-- Große warme Augen -->
      <circle cx="63" cy="48" r="8.2" fill="#f59e0b" stroke="#451a03" stroke-width="2"/>
      <circle cx="64" cy="48" r="4.6" fill="#1e1b18"/>
      <circle cx="61.5" cy="45.5" r="2.2" fill="#ffffff"/>
      <circle cx="91" cy="48" r="8.2" fill="#f59e0b" stroke="#451a03" stroke-width="2"/>
      <circle cx="92" cy="48" r="4.6" fill="#1e1b18"/>
      <circle cx="89.5" cy="45.5" r="2.2" fill="#ffffff"/>
      <!-- Kleiner goldener Schnabel -->
      <polygon points="73,53 83,53 78,63" fill="#f59e0b" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
      <!-- Roter Winterschal mit Fransen -->
      <path d="M40 72 Q76 86 110 72 Q108 88 76 92 Q42 88 40 72 Z" fill="url(#owlScarf)" stroke="#7f1d1d" stroke-width="2.2"/>
      <path d="M84 84 L96 112 L80 116 L72 86 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" stroke-linejoin="round"/>
      <!-- Krallen ganz unten (<= 2% Rand) -->
      <path d="M54 143 L50 156 M60 144 L60 157 M66 143 L69 156" stroke="#d97706" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M84 143 L81 156 M90 144 L90 157 M96 143 L100 156" stroke="#d97706" stroke-width="4.5" stroke-linecap="round"/>
    </svg>`;
    return { svg, anchorY: 0.88, size: 'owl' };
  },

  animal_donkey: () => {
    const W = 256, H = 236;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="donkCoat" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#a8998c"/>
          <stop offset="65%" stop-color="#87786c"/>
          <stop offset="100%" stop-color="#695c51"/>
        </linearGradient>
        <linearGradient id="donkBlanket" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
      </defs>
      <!-- Schwanz hinten links -->
      <path d="M40 128 Q16 146 22 174" fill="none" stroke="#574a40" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="23" cy="178" rx="7" ry="11" fill="#3b312a"/>
      <!-- Hinteres Beinpaar (dunkler für Tiefe) -->
      <rect x="64" y="150" width="17" height="62" rx="7" fill="#63564c" stroke="#3f362f" stroke-width="2.5"/>
      <rect x="63" y="204" width="19" height="14" rx="5" fill="#2d2621"/>
      <rect x="138" y="152" width="17" height="62" rx="7" fill="#63564c" stroke="#3f362f" stroke-width="2.5"/>
      <rect x="137" y="206" width="19" height="14" rx="5" fill="#2d2621"/>
      <!-- Runder freundlicher Körper -->
      <ellipse cx="108" cy="134" rx="68" ry="42" fill="url(#donkCoat)" stroke="#4a3f37" stroke-width="3"/>
      <!-- Heller Bauch -->
      <path d="M58 152 Q108 174 156 148 Q128 164 82 162 Z" fill="#cfc3b8"/>
      <!-- Rote Weihnachts-Satteldecke mit Goldborte -->
      <path d="M68 100 Q108 90 144 102 L140 146 Q106 154 68 142 Z" fill="url(#donkBlanket)" stroke="#7f1d1d" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M72 138 Q106 148 138 142" fill="none" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
      <!-- Vordere Beine fest am unteren Bildrand -->
      <rect x="48" y="152" width="19" height="66" rx="8" fill="#827367" stroke="#4a3f37" stroke-width="2.5"/>
      <rect x="46" y="210" width="23" height="16" rx="6" fill="#2b241f"/>
      <rect x="152" y="156" width="19" height="68" rx="8" fill="#8a7a6e" stroke="#4a3f37" stroke-width="2.5"/>
      <rect x="150" y="214" width="23" height="16" rx="6" fill="#2b241f"/>
      <!-- Hals & zottelige Mähne -->
      <path d="M140 120 Q156 76 172 64 L196 86 Q178 124 160 140 Z" fill="url(#donkCoat)" stroke="#4a3f37" stroke-width="3" stroke-linejoin="round"/>
      <path d="M136 104 L148 80 L156 86 L166 64 L176 74" fill="none" stroke="#3f342c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Lange Eselsohren (nahtlos am Kopf angesetzt) -->
      <path d="M170 54 C152 14, 172 4, 185 46 Z" fill="#8a7a6e" stroke="#4a3f37" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M171 46 C161 24, 171 18, 179 42 Z" fill="#e2b4a6"/>
      <path d="M187 52 C190 8, 214 10, 204 52 Z" fill="#7c6d62" stroke="#4a3f37" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M191 46 C194 22, 206 22, 201 46 Z" fill="#d9a596"/>
      <!-- Freundlicher Kopf & helle Schnauze (blickt nach rechts) -->
      <ellipse cx="192" cy="70" rx="30" ry="24" fill="url(#donkCoat)" stroke="#4a3f37" stroke-width="3"/>
      <ellipse cx="218" cy="82" rx="22" ry="17" fill="#e6d8cc" stroke="#4a3f37" stroke-width="2.6"/>
      <!-- Nüstern & freundliches Lächeln -->
      <circle cx="226" cy="77" r="3" fill="#4a3f37"/>
      <circle cx="234" cy="79" r="2.6" fill="#4a3f37"/>
      <path d="M212 90 Q222 96 230 89" fill="none" stroke="#4a3f37" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Warmes Auge -->
      <circle cx="196" cy="64" r="7.5" fill="#ffffff" stroke="#4a3f37" stroke-width="2"/>
      <circle cx="197.5" cy="64.5" r="4.5" fill="#2c2119"/>
      <circle cx="195.5" cy="62.5" r="1.8" fill="#ffffff"/>
      <!-- Goldenes Glöckchen am roten Halsband -->
      <path d="M158 106 Q178 122 194 114" fill="none" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/>
      <circle cx="188" cy="122" r="8" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
      <circle cx="186" cy="119.5" r="2.2" fill="#fef3c7"/>
    </svg>`;
    return { svg, anchorY: 0.88, size: 'donkey' };
  }
};

function buildRibbonSvg() {
  const S = 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 256 256">
    <defs>
      <filter id="rb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <ellipse cx="132" cy="142" rx="82" ry="52" fill="#1e293b" opacity="0.28" filter="url(#rb)"/>
    <path d="M36 92 L220 170" stroke="#dc2626" stroke-width="24" stroke-linecap="round"/>
    <path d="M36 92 L220 170" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
    <path d="M220 92 L36 170" stroke="#b91c1c" stroke-width="24" stroke-linecap="round"/>
    <path d="M220 92 L36 170" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
    <path d="M128 112 C94 64, 48 72, 62 108 C72 132, 108 124, 128 116 Z" fill="#ef4444" stroke="#991b1b" stroke-width="4"/>
    <path d="M128 112 C162 64, 208 72, 194 108 C184 132, 148 124, 128 116 Z" fill="#dc2626" stroke="#991b1b" stroke-width="4"/>
    <path d="M114 126 L88 184 L112 174 L126 132 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="3"/>
    <path d="M142 126 L168 184 L144 174 L130 132 Z" fill="#991b1b" stroke="#7f1d1d" stroke-width="3"/>
    <circle cx="128" cy="116" r="18" fill="#fbbf24" stroke="#b45309" stroke-width="4"/>
    <circle cx="123" cy="111" r="6" fill="#fef3c7"/>
  </svg>`;
}

function wrapBadge(innerSvg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <filter id="bshad" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
      <radialGradient id="bgrad" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#fef3df"/>
      </radialGradient>
    </defs>
    <ellipse cx="48" cy="84" rx="18" ry="6" fill="#1e293b" opacity="0.32" filter="url(#bshad)"/>
    <path d="M39 73 L48 87 L57 73 Z" fill="#b45309"/>
    <circle cx="48" cy="44" r="36" fill="url(#bgrad)" stroke="#b45309" stroke-width="5"/>
    <circle cx="48" cy="44" r="31.5" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.75"/>
    ${innerSvg}
  </svg>`;
}

const BADGE_BUILDERS = {
  badge_egg: () => wrapBadge(`
    <path d="M48 20 C38 20, 31 36, 31 48 C31 60, 38 66, 48 66 C58 66, 65 60, 65 48 C65 36, 58 20, 48 20 Z" fill="#fef3c7" stroke="#b45309" stroke-width="3"/>
    <ellipse cx="42" cy="36" rx="4.5" ry="9" transform="rotate(-14 42 36)" fill="#ffffff" opacity="0.85"/>
  `),
  badge_starmilk: () => wrapBadge(`
    <rect x="35" y="34" width="26" height="32" rx="6" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.8"/>
    <rect x="40" y="22" width="16" height="12" rx="2" fill="#f8fafc" stroke="#0369a1" stroke-width="2.5"/>
    <rect x="38" y="19" width="20" height="5" rx="2.5" fill="#dc2626"/>
    <polygon points="48,40 50.8,45.8 57,46.6 52.4,50.8 53.6,57 48,54 42.4,57 43.6,50.8 39,46.6 45.2,45.8" fill="#fbbf24" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round"/>
  `),
  badge_wool: () => wrapBadge(`
    <circle cx="48" cy="45" r="20" fill="#f8fafc" stroke="#64748b" stroke-width="2.8"/>
    <circle cx="37" cy="37" r="8" fill="#ffffff"/>
    <circle cx="57" cy="36" r="8" fill="#ffffff"/>
    <circle cx="58" cy="52" r="8" fill="#f1f5f9"/>
    <path d="M32 42 Q48 52 64 40" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M34 51 Q48 60 62 49" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M34 32 Q48 40 60 30" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
  `),
  badge_firewood: () => wrapBadge(`
    <rect x="27" y="42" width="42" height="13" rx="6" fill="#92400e" stroke="#451a03" stroke-width="2.4"/>
    <rect x="27" y="31" width="42" height="13" rx="6" fill="#b45309" stroke="#451a03" stroke-width="2.4"/>
    <circle cx="63" cy="37.5" r="5" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
    <circle cx="63" cy="48.5" r="5" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
    <rect x="44" y="29" width="7" height="28" rx="2" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
  `),
  badge_letter: () => wrapBadge(`
    <rect x="25" y="30" width="46" height="30" rx="4" fill="#fffbeb" stroke="#92400e" stroke-width="2.8"/>
    <polyline points="26,31 48,48 70,31" fill="none" stroke="#92400e" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="48" cy="48" r="6" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.8"/>
  `)
};

mkdirSync(OUT, { recursive: true });
const meta = {};
for (const [key, fn] of Object.entries(BUILDERS)) {
  const res = fn();
  const buf = await sharp(Buffer.from(res.svg)).png({ compressionLevel: 9 }).toFile(join(OUT, `${key}.png`));
  const { data, info } = await sharp(join(OUT, `${key}.png`)).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let maxY = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 8) maxY = y;
  const empty = (info.height - (maxY + 1)) / info.height;
  meta[key] = { size: res.size, anchorY: res.anchorY, emptyPct: +(empty * 100).toFixed(1), px: `${buf.width}x${buf.height}` };
}
await sharp(Buffer.from(buildRibbonSvg())).png({ compressionLevel: 9 }).toFile(join(OUT, 'station_ribbon.png'));
for (const [key, fn] of Object.entries(BADGE_BUILDERS)) {
  await sharp(Buffer.from(fn())).png({ compressionLevel: 9 }).toFile(join(OUT, `${key}.png`));
}

console.log(`Objekt-Platzhalter: ${Object.keys(BUILDERS).length} Sprites + ${Object.keys(BADGE_BUILDERS).length + 1} Overlays`);
console.log(JSON.stringify(meta));
