// ============================================================================
// Platzhalter-Sprites für Baustein 9 „Felder“ (Entscheidungen 39, 69)
// Erzeugt per SVG → sharp (ohne Bild-Kontingent):
//   1. Acker-Erdwulst: art_src/spiel{m}/objekte{tps}/snow_field_plot.png (560×312 @2x)
//      Reine erhöhte Erdwülste ohne Holzrahmen, ohne weißen Schneerand, ohne Leuchtrand,
//      mit runden Ecken und weichem Kontaktschatten direkt darunter (shadow: 'bild').
//   2. 4 Wachstumsstufen-Büschel für alle 10 Feldfrüchte in art_src/spiel{m}/felder{tps}/:
//      feld_keim.png (Stufe 0) + feld_<id>_1/2/3.png (Stufen 1–3), zusammen in 1 kompakten Atlas.
// Austauschbar (Entscheidung 39): in der Grafik-Runde einfach 1:1 durch gemalte Bilder ersetzen.
// ============================================================================
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OBJ_OUT = join(ROOT, 'art_src', 'spiel{m}', 'objekte{tps}');
const FELDER_OUT = join(ROOT, 'art_src', 'spiel{m}', 'felder{tps}');

// ---------------------------------------------------------------- 1. Acker-Erdwulst (560 × 312)
function buildFieldPlotSvg() {
  const W = 560, H = 312;
  const cx = 280, cy = 158;
  const rx = 264, ry = 132;

  // Abgerundete isometrische Raute ohne spitze Ecken (schließt nahtlos an Nachbarfelder an)
  const top = [cx, cy - ry];
  const right = [cx + rx, cy];
  const bot = [cx, cy + ry];
  const left = [cx - rx, cy];
  const r = 0.055; // Dezente Rundung ohne Lücke am 4er-Kreuzungspunkt
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const corners = [
    [lerp(left, top, 1 - r), top, lerp(top, right, r)],
    [lerp(top, right, 1 - r), right, lerp(right, bot, r)],
    [lerp(right, bot, 1 - r), bot, lerp(bot, left, r)],
    [lerp(bot, left, 1 - r), left, lerp(left, top, r)]
  ];
  const d = [
    `M ${corners[0][0][0].toFixed(1)} ${corners[0][0][1].toFixed(1)}`,
    `Q ${corners[0][1][0].toFixed(1)} ${corners[0][1][1].toFixed(1)} ${corners[0][2][0].toFixed(1)} ${corners[0][2][1].toFixed(1)}`,
    `L ${corners[1][0][0].toFixed(1)} ${corners[1][0][1].toFixed(1)}`,
    `Q ${corners[1][1][0].toFixed(1)} ${corners[1][1][1].toFixed(1)} ${corners[1][2][0].toFixed(1)} ${corners[1][2][1].toFixed(1)}`,
    `L ${corners[2][0][0].toFixed(1)} ${corners[2][0][1].toFixed(1)}`,
    `Q ${corners[2][1][0].toFixed(1)} ${corners[2][1][1].toFixed(1)} ${corners[2][2][0].toFixed(1)} ${corners[2][2][1].toFixed(1)}`,
    `L ${corners[3][0][0].toFixed(1)} ${corners[3][0][1].toFixed(1)}`,
    `Q ${corners[3][1][0].toFixed(1)} ${corners[3][1][1].toFixed(1)} ${corners[3][2][0].toFixed(1)} ${corners[3][2][1].toFixed(1)}`,
    'Z'
  ].join(' ');

  // 5 parallele, weich gewölbte Furchenwülste entlang der iso-Achse
  const ridges = [];
  for (let idx = -2; idx <= 2; idx++) {
    const off = idx * 41;
    const xA = cx - 118 + off * 0.92;
    const yA = cy + 59 + off * 0.46;
    const xB = cx + 112 + off * 0.92;
    const yB = cy - 56 + off * 0.46;
    ridges.push(`<line x1="${xA + 2}" y1="${yA + 6}" x2="${xB + 2}" y2="${yB + 6}" stroke="#3e200d" stroke-width="22" stroke-linecap="round" opacity="0.65"/>`);
    ridges.push(`<line x1="${xA}" y1="${yA}" x2="${xB}" y2="${yB}" stroke="#7b4623" stroke-width="21" stroke-linecap="round"/>`);
    ridges.push(`<line x1="${xA - 2}" y1="${yA - 4}" x2="${xB - 2}" y2="${yB - 4}" stroke="#9b6035" stroke-width="9.5" stroke-linecap="round" opacity="0.72"/>`);
  }

  // Kleine Erdkrümel
  const clods = [];
  for (let i = 0; i < 48; i++) {
    const u = ((i * 73) % 100) / 100 - 0.5;
    const v = ((i * 41 + 19) % 100) / 100 - 0.5;
    if (Math.abs(u) + Math.abs(v) > 0.40) continue;
    const x = cx + (u - v) * rx * 1.42;
    const y = cy + (u + v) * ry * 1.42;
    const cr = 2.0 + (i % 3) * 1.05;
    const col = i % 2 === 0 ? '#4d2912' : '#a1663b';
    clods.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(cr * 1.35).toFixed(1)}" ry="${(cr * 0.72).toFixed(1)}" fill="${col}" opacity="0.56"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="soilBlur" x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur stdDeviation="5.5"/>
      </filter>
      <filter id="ridgeSoft" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="1.6"/>
      </filter>
      <clipPath id="fieldClip">
        <path d="${d}"/>
      </clipPath>
      <linearGradient id="earthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#87512a"/>
        <stop offset="55%" stop-color="#6e3e1e"/>
        <stop offset="100%" stop-color="#552f15"/>
      </linearGradient>
    </defs>

    <!-- Weicher Kontaktschatten direkt unter der erhöhten Erde (Licht oben links -> Schatten unten rechts) -->
    <path d="${d}" transform="translate(4, 13)" fill="#283c46" opacity="0.28" filter="url(#soilBlur)"/>
    <path d="${d}" transform="translate(0, 9)" fill="#26150a" opacity="0.25" filter="url(#soilBlur)"/>

    <!-- Weiche, nahtlose Böschungskante ohne Eck-Kerbe -->
    <path d="${d}" fill="#482510" stroke="#482510" stroke-width="10" stroke-linejoin="round" transform="translate(0, 6)"/>
    <path d="${d}" fill="url(#earthGrad)" stroke="#623618" stroke-width="4" stroke-linejoin="round"/>

    <!-- Gepflügte Furchenwülste + Krümel innerhalb der Scholle -->
    <g clip-path="url(#fieldClip)">
      <g filter="url(#ridgeSoft)">${ridges.join('')}</g>
      ${clods.join('')}
      <path d="M ${cx - rx} ${cy} L ${cx} ${cy - ry} L ${cx + rx} ${cy}" fill="none" stroke="#ad6f3e" stroke-width="6" opacity="0.44"/>
      <path d="M ${cx - rx} ${cy} L ${cx} ${cy + ry} L ${cx + rx} ${cy}" fill="none" stroke="#3c1e0b" stroke-width="7" opacity="0.46"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------- 2. Wachstumsstufen-Sprites (4 Stufen)
const wrapCrop = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="cs" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>
  <ellipse cx="${w / 2 + 2}" cy="${Math.round(h * 0.85)}" rx="${Math.round(w * 0.24)}" ry="${Math.round(h * 0.06)}" fill="#26160b" opacity="0.34" filter="url(#cs)"/>
  ${body}
</svg>`;

const keimSvg = () => wrapCrop(88, 88, `
  <ellipse cx="44" cy="73" rx="16" ry="6" fill="#462510" opacity="0.75"/>
  <path d="M40 73 C37 64, 33 59, 28 56 C33 56, 38 61, 42 72 Z" fill="#8bd13b"/>
  <path d="M45 74 C45 62, 46 53, 49 47 C50 56, 49 65, 47 74 Z" fill="#a2e34d"/>
  <path d="M48 73 C51 65, 56 60, 61 58 C56 62, 53 67, 50 73 Z" fill="#76bd2d"/>
`);

function cropPalettes() {
  return {
    wheat:      { stem: '#7ab332', mid: '#dfbb3e', bright: '#f5c948', fruit: '#ffd962', style: 'grain' },
    berries:    { stem: '#34702e', mid: '#2a5f27', bright: '#4f973e', fruit: '#d62839', style: 'berry' },
    matcha:     { stem: '#42852f', mid: '#5ea836', bright: '#86d149', fruit: '#a8ea66', style: 'leaf' },
    cocoa:      { stem: '#547e2f', mid: '#784824', bright: '#9b6234', fruit: '#7e4621', style: 'pod' },
    cinnamon:   { stem: '#598234', mid: '#9c5a2c', bright: '#c97b3f', fruit: '#f3dfb6', style: 'spice' },
    candycane:  { stem: '#4c8e3c', mid: '#e0333b', bright: '#ffffff', fruit: '#f04248', style: 'cane' },
    apples:     { stem: '#3d792d', mid: '#54973c', bright: '#73b84f', fruit: '#dd2c2f', style: 'apple' },
    almonds:    { stem: '#5a8839', mid: '#7aa74b', bright: '#c9995a', fruit: '#e3b87d', style: 'nut' },
    fir_greens: { stem: '#275b32', mid: '#357840', bright: '#4fa357', fruit: '#b83238', style: 'fir' },
    walnuts:    { stem: '#4c792d', mid: '#6c993f', bright: '#9d713d', fruit: '#b9884e', style: 'nut' }
  };
}

function stage1Svg(p) {
  return wrapCrop(96, 104, `
    <path d="M45 87 C38 72, 29 58, 22 48 C30 53, 39 67, 46 86 Z" fill="${p.stem}"/>
    <path d="M48 88 C47 68, 46 47, 45 34 C50 49, 51 69, 50 88 Z" fill="${p.bright}"/>
    <path d="M51 87 C57 73, 66 60, 74 51 C67 62, 58 75, 53 87 Z" fill="${p.stem}"/>
    <path d="M43 86 C35 76, 26 70, 19 67 C27 72, 34 79, 41 86 Z" fill="${p.bright}" opacity="0.85"/>
  `);
}

function stage2Svg(p) {
  const tip = p.style === 'grain'
    ? `<ellipse cx="46" cy="27" rx="6" ry="13" fill="${p.mid}"/><ellipse cx="30" cy="39" rx="5" ry="10" transform="rotate(-18 30 39)" fill="${p.mid}"/><ellipse cx="63" cy="40" rx="5" ry="10" transform="rotate(16 63 40)" fill="${p.mid}"/>`
    : `<circle cx="34" cy="46" r="5" fill="${p.fruit}" opacity="0.85"/><circle cx="58" cy="48" r="5" fill="${p.fruit}" opacity="0.85"/><circle cx="48" cy="37" r="5.5" fill="${p.bright}"/>`;
  return wrapCrop(96, 116, `
    <path d="M42 97 C36 77, 29 56, 26 42 C32 54, 39 74, 45 97 Z" fill="${p.stem}"/>
    <path d="M47 98 C46 72, 46 46, 47 26 C51 47, 51 73, 50 98 Z" fill="${p.stem}"/>
    <path d="M51 97 C57 78, 64 58, 69 44 C64 60, 58 79, 54 97 Z" fill="${p.stem}"/>
    <path d="M41 96 C31 82, 22 72, 16 68 C25 74, 33 83, 40 96 Z" fill="${p.bright}"/>
    <path d="M54 96 C64 83, 73 74, 80 70 C72 76, 63 85, 56 96 Z" fill="${p.bright}"/>
    ${tip}
  `);
}

function wheatEar(x, y, rot) {
  const kernels = [];
  for (let row = 0; row < 4; row++) {
    const ky = 10 - row * 7.5;
    kernels.push(`<ellipse cx="-3.4" cy="${ky}" rx="3.5" ry="5.2" transform="rotate(-24 -3.4 ${ky})" fill="#e3a82b"/>`);
    kernels.push(`<ellipse cx="3.4" cy="${ky - 1.5}" rx="3.5" ry="5.2" transform="rotate(24 3.4 ${ky - 1.5})" fill="#ffd95a"/>`);
    kernels.push(`<line x1="-4" y1="${ky - 4}" x2="-7" y2="${ky - 11}" stroke="#ffe999" stroke-width="1.2"/>`);
    kernels.push(`<line x1="4" y1="${ky - 5}" x2="7" y2="${ky - 12}" stroke="#ffe999" stroke-width="1.2"/>`);
  }
  kernels.push(`<ellipse cx="0" cy="-19" rx="3" ry="5.2" fill="#ffe57a"/>`);
  kernels.push(`<line x1="0" y1="-23" x2="0" y2="-30" stroke="#fff0aa" stroke-width="1.4"/>`);
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${kernels.join('')}</g>`;
}

function stage3Svg(p) {
  if (p.style === 'grain') {
    const stalks = [
      { bx: 44, tx: 22, ty: 44, r: -16 },
      { bx: 49, tx: 37, ty: 32, r: -8 },
      { bx: 54, tx: 54, ty: 26, r: 0 },
      { bx: 58, tx: 71, ty: 33, r: 10 },
      { bx: 62, tx: 85, ty: 45, r: 17 }
    ];
    const parts = stalks.map((s) => `
      <path d="M${s.bx} 111 Q${(s.bx + s.tx) / 2} ${(111 + s.ty) / 2}, ${s.tx} ${s.ty + 10}" stroke="#c29225" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      ${wheatEar(s.tx, s.ty, s.r)}
    `).join('');
    return wrapCrop(108, 132, `
      <path d="M46 111 C32 95, 22 83, 14 77 C24 85, 34 97, 44 111 Z" fill="#c4952b"/>
      <path d="M62 111 C76 95, 86 84, 94 79 C84 87, 74 98, 64 111 Z" fill="#c4952b"/>
      ${parts}
    `);
  }

  if (p.style === 'cane') {
    const canes = [
      { x: 34, y: 40, rot: -14 },
      { x: 54, y: 28, rot: 2 },
      { x: 74, y: 42, rot: 15 }
    ].map((c) => `
      <g transform="translate(${c.x} ${c.y}) rotate(${c.rot})">
        <path d="M0 68 L0 16 C0 4, 16 4, 16 16" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/>
        <path d="M0 68 L0 16 C0 4, 16 4, 16 16" fill="none" stroke="#db2b32" stroke-width="9" stroke-dasharray="8 8" stroke-linecap="butt"/>
      </g>
    `).join('');
    return wrapCrop(108, 132, `
      <ellipse cx="54" cy="98" rx="34" ry="16" fill="#3a7c32"/>
      ${canes}
    `);
  }

  if (p.style === 'fir') {
    return wrapCrop(108, 132, `
      <path d="M54 18 L86 64 L68 64 L92 94 L68 94 L95 112 L13 112 L40 94 L16 94 L40 64 L22 64 Z" fill="${p.stem}"/>
      <path d="M54 18 L80 60 L62 60 L82 88 L60 88 L82 108 L26 108 L46 88 L26 88 L44 60 L30 60 Z" fill="${p.bright}" opacity="0.72"/>
      <circle cx="46" cy="54" r="5" fill="${p.fruit}"/><circle cx="66" cy="76" r="5" fill="${p.fruit}"/><circle cx="40" cy="96" r="5" fill="${p.fruit}"/>
    `);
  }

  const fruits = [
    [34, 62], [53, 47], [73, 62], [43, 79], [65, 79], [54, 65]
  ].map(([fx, fy]) => `
    <circle cx="${fx}" cy="${fy}" r="${p.style === 'apple' ? 8.5 : 6.4}" fill="${p.fruit}"/>
    <circle cx="${fx - 2}" cy="${fy - 2}" r="2.2" fill="#ffffff" opacity="0.65"/>
  `).join('');

  return wrapCrop(108, 132, `
    <circle cx="33" cy="84" r="22" fill="${p.stem}"/>
    <circle cx="75" cy="84" r="22" fill="${p.stem}"/>
    <circle cx="54" cy="90" r="24" fill="${p.stem}"/>
    <circle cx="38" cy="72" r="20" fill="${p.mid}"/>
    <circle cx="70" cy="73" r="20" fill="${p.mid}"/>
    <circle cx="54" cy="57" r="22" fill="${p.bright}"/>
    ${fruits}
  `);
}

mkdirSync(OBJ_OUT, { recursive: true });
mkdirSync(FELDER_OUT, { recursive: true });

await sharp(Buffer.from(buildFieldPlotSvg())).png({ compressionLevel: 9 }).toFile(join(OBJ_OUT, 'snow_field_plot.png'));
await sharp(Buffer.from(keimSvg())).png({ compressionLevel: 9 }).toFile(join(FELDER_OUT, 'feld_keim.png'));

const palettes = cropPalettes();
let count = 2;
for (const [id, pal] of Object.entries(palettes)) {
  await sharp(Buffer.from(stage1Svg(pal))).png({ compressionLevel: 9 }).toFile(join(FELDER_OUT, `feld_${id}_1.png`));
  await sharp(Buffer.from(stage2Svg(pal))).png({ compressionLevel: 9 }).toFile(join(FELDER_OUT, `feld_${id}_2.png`));
  await sharp(Buffer.from(stage3Svg(pal))).png({ compressionLevel: 9 }).toFile(join(FELDER_OUT, `feld_${id}_3.png`));
  count += 3;
}
console.log(`Feld-Platzhalter: ${count} PNGs erzeugt (Erdwulst + ${Object.keys(palettes).length} Früchte × 3 + Keimling).`);
