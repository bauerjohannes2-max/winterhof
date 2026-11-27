// ============================================================================
// Platzhalter-Sprites für Baustein 7b „Boden-Deko“ (Entscheidungen 39, 51, 52)
// Erzeugt 6 saubere, weich gezeichnete Platzhalter-PNGs (96 × 96 @2x) per SVG → sharp
// nach art_src/spiel{m}/boden_deko{tps}/ (AssetPack bündelt alle 6 in 1 winzigen Atlas).
// Alle 6 teilen Licht oben links, kühlen Bodenschatten unten rechts und Bodenpunkt anchorY = 0,80.
// Austauschbar (Entscheidung 39): in der Grafik-Runde einfach 1:1 durch gemalte Bilder ersetzen.
// ============================================================================
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'art_src', 'spiel{m}', 'boden_deko{tps}');
const SIZE = 96;

const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 96 96">
  <defs>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
  </defs>
  ${body}
</svg>`;

const SPRITES = {
  // 1. Grasbüschel: harmonische Wiesentöne (oben links heller), Fuß weich
  deko_buschel: wrap(`
    <ellipse cx="51" cy="77" rx="22" ry="7" fill="#283c46" opacity="0.22" filter="url(#sh)"/>
    <path d="M44 76 C40 62, 31 50, 22 44 C30 54, 34 64, 38 76 Z" fill="#6ca81e"/>
    <path d="M52 76 C56 60, 66 49, 75 44 C67 54, 61 65, 57 76 Z" fill="#639e1a"/>
    <path d="M46 77 C43 58, 38 42, 34 30 C41 44, 46 58, 49 77 Z" fill="#8bc72b"/>
    <path d="M50 77 C52 57, 58 41, 64 31 C59 45, 55 60, 53 77 Z" fill="#7cb824"/>
    <path d="M47 77 C47 56, 48 39, 49 24 C52 40, 52 57, 51 77 Z" fill="#a8d83a"/>
    <path d="M41 76 C37 64, 32 56, 26 53 C32 60, 36 67, 39 76 Z" fill="#9ccf34"/>
  `),

  // 2. Alpen-Kiesel mit kleiner Schneehaube (groß + klein)
  deko_stein: wrap(`
    <ellipse cx="52" cy="77" rx="28" ry="9" fill="#283c46" opacity="0.28" filter="url(#sh)"/>
    <ellipse cx="42" cy="67" rx="21" ry="13" fill="#78828e"/>
    <ellipse cx="40" cy="64" rx="18" ry="10.5" fill="#95a0ad"/>
    <path d="M25 62 C27 52, 42 50, 54 56 C57 59, 55 62, 48 61 C40 60, 33 64, 25 62 Z" fill="#eef5fc"/>
    <path d="M27 60 C31 53, 43 52, 51 56 C44 55, 34 57, 27 60 Z" fill="#ffffff" opacity="0.85"/>
    <ellipse cx="64" cy="72" rx="11" ry="7" fill="#707a86"/>
    <ellipse cx="63" cy="70" rx="9" ry="5.5" fill="#8d98a6"/>
    <path d="M55 69 C57 64, 66 64, 70 68 C66 68, 60 70, 55 69 Z" fill="#eef5fc"/>
  `),

  // 3. Christrose (Winterblüte): tiefgrüne Blätter + 2 cremeweiße Blüten
  deko_christrose: wrap(`
    <ellipse cx="51" cy="77" rx="25" ry="8" fill="#283c46" opacity="0.26" filter="url(#sh)"/>
    <ellipse cx="34" cy="70" rx="14" ry="7" transform="rotate(-18 34 70)" fill="#2d662d"/>
    <ellipse cx="62" cy="71" rx="14" ry="7" transform="rotate(16 62 71)" fill="#275c28"/>
    <ellipse cx="48" cy="74" rx="15" ry="6.5" fill="#3a7d35"/>
    <g transform="translate(39 58)">
      <circle cx="0" cy="-9" r="7" fill="#faf7f0"/>
      <circle cx="8.5" cy="-3" r="7" fill="#f5f0e6"/>
      <circle cx="5.2" cy="7" r="7" fill="#ede6d8"/>
      <circle cx="-5.2" cy="7" r="7" fill="#f3ede1"/>
      <circle cx="-8.5" cy="-3" r="7" fill="#ffffff"/>
      <circle cx="0" cy="0" r="4.6" fill="#f2c43d"/>
      <circle cx="-1.3" cy="-1.3" r="1.8" fill="#fff0a6"/>
    </g>
    <g transform="translate(60 63) scale(0.76)">
      <circle cx="0" cy="-9" r="7" fill="#faf7f0"/>
      <circle cx="8.5" cy="-3" r="7" fill="#f3ede1"/>
      <circle cx="5.2" cy="7" r="7" fill="#ebe3d5"/>
      <circle cx="-5.2" cy="7" r="7" fill="#f3ede1"/>
      <circle cx="-8.5" cy="-3" r="7" fill="#ffffff"/>
      <circle cx="0" cy="0" r="4.6" fill="#f2c43d"/>
    </g>
  `),

  // 4. Stechpalme: 2 glänzende gezackte Blätter + 3 rote Beeren
  deko_stechpalme: wrap(`
    <ellipse cx="51" cy="77" rx="25" ry="8" fill="#283c46" opacity="0.26" filter="url(#sh)"/>
    <path d="M48 70 C38 66, 26 62, 18 55 C24 52, 24 46, 30 45 C34 49, 41 51, 48 61 Z" fill="#266b38"/>
    <path d="M47 68 C39 64, 29 59, 22 54 C30 54, 38 56, 47 63 Z" fill="#3b8c4c"/>
    <path d="M48 70 C58 66, 70 62, 78 54 C71 51, 71 45, 65 44 C61 48, 55 51, 48 61 Z" fill="#1e592e"/>
    <path d="M49 67 C57 63, 66 58, 73 53 C66 53, 58 56, 49 63 Z" fill="#2e7840"/>
    <circle cx="43" cy="64" r="6" fill="#c92428"/>
    <circle cx="54" cy="65" r="6" fill="#b81e22"/>
    <circle cx="48" cy="57" r="6.2" fill="#dc2d32"/>
    <circle cx="41" cy="62" r="2" fill="#ff9d9f" opacity="0.85"/>
    <circle cx="52" cy="63" r="1.8" fill="#ff9d9f" opacity="0.8"/>
    <circle cx="46" cy="55" r="2.2" fill="#ffb8ba" opacity="0.9"/>
  `),

  // 5. Tannenzapfen: 2 kleine schräg liegende Zapfen
  deko_zapfen: wrap(`
    <ellipse cx="51" cy="77" rx="24" ry="7.5" fill="#283c46" opacity="0.28" filter="url(#sh)"/>
    <g transform="translate(41 66) rotate(-26)">
      <ellipse cx="0" cy="0" rx="13" ry="9" fill="#6f431f"/>
      <ellipse cx="-2" cy="-2" rx="10" ry="6.5" fill="#945d2e"/>
      <path d="M-8 -2 Q-4 -6 0 -2 Q4 -6 8 -2 M-6 3 Q-2 -1 2 3 Q6 -1 9 2" stroke="#573215" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="-5" cy="-4" rx="4" ry="2" fill="#c48a52" opacity="0.65"/>
    </g>
    <g transform="translate(60 70) rotate(18) scale(0.82)">
      <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="#683d1b"/>
      <ellipse cx="-2" cy="-2" rx="9.5" ry="6" fill="#8b5528"/>
      <path d="M-7 -2 Q-3 -5 1 -2 Q5 -5 8 -2 M-5 3 Q-1 -1 3 3" stroke="#4f2c12" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
  `),

  // 6. Fliegenpilze: 1 großer + 1 kleiner Pilz
  deko_pilz: wrap(`
    <ellipse cx="51" cy="77" rx="24" ry="8" fill="#283c46" opacity="0.28" filter="url(#sh)"/>
    <rect x="36" y="57" width="11" height="19" rx="5" fill="#e8dfd0"/>
    <rect x="37" y="57" width="5" height="18" rx="3" fill="#f7f2e8"/>
    <path d="M23 59 C23 42, 60 42, 60 59 C52 63, 31 63, 23 59 Z" fill="#cb2a26"/>
    <path d="M25 57 C27 45, 51 44, 57 54 C48 51, 33 52, 25 57 Z" fill="#e3423b" opacity="0.7"/>
    <circle cx="33" cy="52" r="3" fill="#fffaf0"/>
    <circle cx="43" cy="48" r="3.2" fill="#fffaf0"/>
    <circle cx="52" cy="54" r="2.6" fill="#fffaf0"/>
    <rect x="57" y="65" width="8" height="12" rx="3.5" fill="#e4dac9"/>
    <path d="M49 67 C49 56, 73 56, 73 67 C68 70, 54 70, 49 67 Z" fill="#c22622"/>
    <circle cx="56" cy="62" r="2.1" fill="#fffaf0"/>
    <circle cx="65" cy="61" r="2.2" fill="#fffaf0"/>
  `)
};

mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(SPRITES)) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
}
console.log(`Boden-Deko Platzhalter: ${Object.keys(SPRITES).length} PNGs nach ${OUT}`);
