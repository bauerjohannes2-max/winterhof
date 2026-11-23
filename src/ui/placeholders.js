// ============================================================================
// Winterhof – Platzhalter-Bilder (Hannes 23.11.: Inhalte jetzt einbauen,
// echte Grafik von Gemini ganz am Schluss). Jedes Objekt ohne eigenes Bild
// bekommt automatisch ein einfaches, erkennbares Platzhalter-Bild.
// Sobald eine echte Datei in assets/sprites/ liegt und in art.sprites steht,
// wird sie statt des Platzhalters genommen – ohne Code-Änderung.
// ============================================================================

const PALETTE = ['#B91C1C', '#B45309', '#15803D', '#1D4ED8', '#7C3AED', '#BE185D', '#0E7490', '#A16207', '#4D7C0F', '#9F1239'];

function hash(str) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function accentOf(id, preferred) {
  return preferred || PALETTE[hash(id) % PALETTE.length];
}

function initials(name) {
  const parts = String(name || '?').replace(/[^A-Za-zÄÖÜäöüß\s-]/g, '').split(/[\s-]+/).filter(Boolean);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2);
  return s.toUpperCase();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Gebäude: Haus mit Schneedach, Akzentfarbe, Kürzel auf der Wand. */
export function buildingSvg(def) {
  const c = accentOf(def.id, def.accent);
  const d = shade(c, 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220">
  <ellipse cx="120" cy="204" rx="104" ry="14" fill="rgba(30,50,90,0.18)"/>
  <path d="M34 112 L120 150 L206 112 L206 190 L120 214 L34 190 Z" fill="${c}" stroke="#4A2410" stroke-width="4" stroke-linejoin="round"/>
  <path d="M120 150 L120 214" stroke="#4A2410" stroke-width="3"/>
  <path d="M120 150 L206 112 L206 190 L120 214 Z" fill="${d}" opacity="0.55"/>
  <path d="M20 118 L120 36 L220 118 L120 158 Z" fill="#7A3E1C" stroke="#4A2410" stroke-width="4" stroke-linejoin="round"/>
  <path d="M30 112 L120 42 L210 112 L196 116 L120 58 L44 116 Z" fill="#F8FBFF" stroke="#C7D7EA" stroke-width="2"/>
  <rect x="98" y="168" width="28" height="40" rx="10" fill="#4A2410"/>
  <circle cx="120" cy="96" r="20" fill="#FFFDF7" stroke="#4A2410" stroke-width="3"/>
  <text x="120" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#4A2410">${esc(initials(def.name))}</text>
</svg>`;
}

/** Tier: runder Körper + Kopf in eigener Farbe. */
export function animalSvg(def) {
  const c = accentOf(def.id, def.accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">
  <ellipse cx="80" cy="128" rx="56" ry="9" fill="rgba(30,50,90,0.18)"/>
  <rect x="50" y="96" width="10" height="30" rx="4" fill="#4A2410"/><rect x="96" y="96" width="10" height="30" rx="4" fill="#4A2410"/>
  <ellipse cx="74" cy="84" rx="50" ry="34" fill="${c}" stroke="#4A2410" stroke-width="4"/>
  <circle cx="124" cy="56" r="24" fill="${shade(c, 1.15)}" stroke="#4A2410" stroke-width="4"/>
  <circle cx="132" cy="50" r="4" fill="#2B1408"/>
  <text x="70" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFDF7">${esc(initials(def.name))}</text>
</svg>`;
}

/** Deko: Sockel mit Kugel. */
export function decoSvg(def) {
  const c = accentOf(def.id, def.accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <ellipse cx="60" cy="150" rx="40" ry="8" fill="rgba(30,50,90,0.18)"/>
  <path d="M34 150 L42 96 L78 96 L86 150 Z" fill="#8B5A2B" stroke="#4A2410" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="60" cy="64" r="38" fill="${c}" stroke="#4A2410" stroke-width="4"/>
  <path d="M30 52 Q60 30 90 52" fill="none" stroke="#F8FBFF" stroke-width="7" stroke-linecap="round"/>
  <text x="60" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFDF7">${esc(initials(def.name))}</text>
</svg>`;
}

/** Reife Feldfrucht: Blätter + Früchte in der Warenfarbe. */
export function cropSvg(item) {
  const c = item.color || accentOf(item.id);
  const fruit = [[34, 58], [62, 44], [90, 58], [48, 78], [78, 78]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}" stroke="${shade(c, 0.55)}" stroke-width="3"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 104">
  <g fill="#3F8F3A" stroke="#1F4D1C" stroke-width="3">
    <ellipse cx="30" cy="80" rx="20" ry="10" transform="rotate(-25 30 80)"/><ellipse cx="94" cy="80" rx="20" ry="10" transform="rotate(25 94 80)"/>
    <ellipse cx="62" cy="88" rx="22" ry="10"/>
  </g>${fruit}
</svg>`;
}

/** Waren-Symbol: runde Marke mit Kürzel. */
export function itemIconSvg(item) {
  const c = item.color || accentOf(item.id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="32" fill="${c}" stroke="${shade(c, 0.55)}" stroke-width="4"/>
  <circle cx="40" cy="40" r="24" fill="none" stroke="#FFFDF7" stroke-width="2.5" opacity="0.7"/>
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFDF7">${esc(initials(item.name))}</text>
</svg>`;
}

/**
 * Liste aller Platzhalter, die für die Inhalte fehlen.
 * @param content winterhof.json
 * @param has (key) => boolean – gibt es schon ein echtes Bild?
 */
export function missingPlaceholders(content, has) {
  const out = [];
  for (const def of Object.values(content.stations)) if (def.sprite && !has(def.sprite)) out.push({ key: def.sprite, svg: buildingSvg(def), icon: true });
  for (const def of Object.values(content.animals)) if (def.sprite && !has(def.sprite)) out.push({ key: def.sprite, svg: animalSvg(def), icon: true });
  for (const def of Object.values(content.decorations)) if (def.sprite && !has(def.sprite)) out.push({ key: def.sprite, svg: decoSvg(def), icon: true });
  for (const it of Object.values(content.items)) {
    if (it.category === 'crop' && !has(`crop_${it.id}`)) out.push({ key: `crop_${it.id}`, svg: cropSvg(it), icon: false });
    if (!has(it.id)) out.push({ key: it.id, svg: itemIconSvg(it), icon: true, itemIcon: true });
  }
  return out;
}
