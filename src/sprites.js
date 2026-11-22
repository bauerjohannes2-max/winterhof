// ============================================================================
// WINTERHOF — 19 Hand-Painted 3D Christmas WebP Sprites + Custom Vector Icons
// Zero Emojis · Consistent Warm Storybook Visual Language
// ============================================================================

const WEBP_SPRITES = [
  'winter_chalet',
  'christmas_bakery',
  'punch_stand',
  'patisserie_house',
  'gift_workshop',
  'christmas_tree',
  'reindeer_sleigh',
  'wishlist_board',
  'gift_mailbox',
  'animal_chicken',
  'animal_sheep',
  'animal_reindeer',
  'snow_field_plot',
  'crop_wheat',
  'crop_berries',
  'crop_matcha',
  'deco_pine',
  'deco_snowman',
  'deco_lantern'
];

// Painterly 2.5D Winter Props (soft warm borders matching the 3D WebP palette)
const VECTOR_SPRITES_SVG = {
  treasure_chest: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 170">
    <defs>
      <linearGradient id="chW" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B86B32"/><stop offset="100%" stop-color="#6B3410"/></linearGradient>
      <linearGradient id="chG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FEF3C7"/><stop offset="48%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#B45309"/></linearGradient>
    </defs>
    <g stroke="#5C2D12" stroke-width="2.5" stroke-linejoin="round">
      <rect x="30" y="76" width="120" height="64" rx="12" fill="url(#chW)"/>
      <path d="M26,78 C26,42 154,42 154,78 Z" fill="#C97B36"/>
      <rect x="26" y="72" width="128" height="12" rx="4" fill="url(#chG)"/>
      <rect x="46" y="48" width="13" height="92" rx="3" fill="url(#chG)"/>
      <rect x="121" y="48" width="13" height="92" rx="3" fill="url(#chG)"/>
      <rect x="78" y="74" width="24" height="26" rx="6" fill="url(#chG)"/>
      <circle cx="90" cy="86" r="4" fill="#5C2D12" stroke="none"/>
    </g>
    <path d="M34,54 Q90,34 146,54 Q124,62 90,56 Q56,62 34,54 Z" fill="#FFFFFF" opacity="0.88"/>
  </svg>`,
  crop_cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190">
    <defs>
      <radialGradient id="leafG" cx="35%" cy="25%" r="70%"><stop offset="0%" stop-color="#5DBB4D"/><stop offset="65%" stop-color="#2E7D32"/><stop offset="100%" stop-color="#1B4D20"/></radialGradient>
      <radialGradient id="podG" cx="32%" cy="28%" r="72%"><stop offset="0%" stop-color="#D9822B"/><stop offset="50%" stop-color="#8C4218"/><stop offset="100%" stop-color="#4A1E0A"/></radialGradient>
    </defs>
    <g stroke="#2B1A10" stroke-width="2">
      <ellipse cx="110" cy="134" rx="80" ry="40" fill="#1F5B24"/>
      <ellipse cx="62" cy="112" rx="32" ry="24" fill="url(#leafG)"/>
      <ellipse cx="158" cy="112" rx="32" ry="24" fill="url(#leafG)"/>
      <ellipse cx="110" cy="94" rx="46" ry="32" fill="url(#leafG)"/>
    </g>
    <g stroke="#4A1E0A" stroke-width="2">
      <ellipse cx="70" cy="114" rx="17" ry="24" transform="rotate(-18 70 114)" fill="url(#podG)"/>
      <ellipse cx="150" cy="112" rx="17" ry="24" transform="rotate(20 150 112)" fill="url(#podG)"/>
      <ellipse cx="110" cy="100" rx="20" ry="28" fill="url(#podG)"/>
      <ellipse cx="112" cy="136" rx="16" ry="21" fill="url(#podG)"/>
    </g>
  </svg>`,
  crop_cinnamon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190">
    <defs><linearGradient id="barkG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E89C54"/><stop offset="45%" stop-color="#B85D19"/><stop offset="100%" stop-color="#6B2E08"/></linearGradient></defs>
    <ellipse cx="110" cy="138" rx="78" ry="36" fill="#226832" stroke="#143E1D" stroke-width="2"/>
    <g stroke="#59280B" stroke-width="2">
      <rect x="66" y="56" width="22" height="90" rx="10" transform="rotate(-18 77 105)" fill="url(#barkG)"/>
      <rect x="132" y="56" width="22" height="90" rx="10" transform="rotate(16 143 104)" fill="url(#barkG)"/>
      <rect x="96" y="40" width="28" height="104" rx="12" fill="url(#barkG)"/>
    </g>
    <path d="M84,118 Q110,128 136,118 L136,129 Q110,139 84,129Z" fill="#C1121F" stroke="#781016" stroke-width="2"/>
  </svg>`,
  crop_candycane: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200">
    <defs><pattern id="ccStripe" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="18" height="18" fill="#FFFDF9"/><rect width="9" height="18" fill="#D62828"/></pattern></defs>
    <ellipse cx="110" cy="154" rx="76" ry="30" fill="#EBF5FF" stroke="#B6D2EC" stroke-width="2"/>
    <g transform="translate(66,148) rotate(-14)"><path d="M0,0 L0,-74 C0,-98 -34,-98 -34,-74" fill="none" stroke="#8C1D1D" stroke-width="20" stroke-linecap="round"/><path d="M0,0 L0,-74 C0,-98 -34,-98 -34,-74" fill="none" stroke="url(#ccStripe)" stroke-width="16" stroke-linecap="round"/></g>
    <g transform="translate(154,148) rotate(14)"><path d="M0,0 L0,-74 C0,-98 34,-98 34,-74" fill="none" stroke="#8C1D1D" stroke-width="20" stroke-linecap="round"/><path d="M0,0 L0,-74 C0,-98 34,-98 34,-74" fill="none" stroke="url(#ccStripe)" stroke-width="16" stroke-linecap="round"/></g>
    <g transform="translate(106,158)"><path d="M0,0 L0,-94 C0,-124 42,-124 42,-92" fill="none" stroke="#8C1D1D" stroke-width="26" stroke-linecap="round"/><path d="M0,0 L0,-94 C0,-124 42,-124 42,-92" fill="none" stroke="url(#ccStripe)" stroke-width="21" stroke-linecap="round"/></g>
  </svg>`,
  deco_giftpile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180">
    <defs>
      <linearGradient id="gpR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EF4444"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      <linearGradient id="gpG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22C55E"/><stop offset="100%" stop-color="#14532D"/></linearGradient>
    </defs>
    <g stroke="#6B1D1D" stroke-width="2" stroke-linejoin="round">
      <polygon points="36,104 96,76 154,104 94,132" fill="#F87171"/><polygon points="36,104 94,132 94,166 36,138" fill="url(#gpR)"/><polygon points="154,104 94,132 94,166 154,138" fill="#991B1B"/>
      <polygon points="62,92 78,84 134,112 118,120" fill="#FACC15" stroke="#B45309" stroke-width="1.5"/>
    </g>
    <g stroke="#14532D" stroke-width="2" stroke-linejoin="round">
      <polygon points="66,58 106,40 146,58 106,76" fill="#4ADE80"/><polygon points="66,58 106,76 106,108 66,90" fill="url(#gpG)"/><polygon points="146,58 106,76 106,108 146,90" fill="#14532D"/>
    </g>
    <g fill="#DC2626" stroke="#7F1D1D" stroke-width="1.8">
      <ellipse cx="92" cy="40" rx="17" ry="10" transform="rotate(-22 92 40)"/><ellipse cx="120" cy="40" rx="17" ry="10" transform="rotate(22 120 40)"/><circle cx="106" cy="44" r="7" fill="#F87171"/>
    </g>
  </svg>`,
  deco_bench: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 175">
    <g stroke="#334155" stroke-width="6" stroke-linecap="round"><line x1="48" y1="98" x2="42" y2="148"/><line x1="88" y1="118" x2="84" y2="162"/><line x1="156" y1="86" x2="152" y2="134"/></g>
    <g fill="#B86B32" stroke="#5C2D12" stroke-width="2.2" stroke-linejoin="round">
      <polygon points="44,68 148,26 156,42 52,84"/><polygon points="50,86 154,44 162,60 58,102"/><polygon points="42,108 148,66 174,80 68,122"/>
    </g>
    <path d="M62,76 L104,59 L126,86 L102,126 L68,118 Z" fill="#C1121F" stroke="#781016" stroke-width="2"/>
    <rect x="134" y="64" width="18" height="22" rx="3" fill="#FEF08A" stroke="#475569" stroke-width="2"/><polygon points="130,64 143,52 156,64" fill="#475569"/>
  </svg>`,
  deco_lightarch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 230">
    <g fill="#8C4818" stroke="#4A2408" stroke-width="2.5"><rect x="36" y="100" width="22" height="114" rx="6"/><rect x="162" y="100" width="22" height="114" rx="6"/></g>
    <path d="M46,112 C46,18 174,18 174,112" fill="none" stroke="#164E27" stroke-width="34" stroke-linecap="round"/>
    <path d="M46,112 C46,18 174,18 174,112" fill="none" stroke="#2D8A42" stroke-width="24" stroke-linecap="round"/>
    <g fill="#FEF08A" stroke="#D97706" stroke-width="1.5"><circle cx="52" cy="96" r="6"/><circle cx="66" cy="64" r="6"/><circle cx="88" cy="46" r="6"/><circle cx="110" cy="40" r="7"/><circle cx="132" cy="46" r="6"/><circle cx="154" cy="64" r="6"/><circle cx="168" cy="96" r="6"/></g>
    <g fill="#C1121F" stroke="#781016" stroke-width="2"><ellipse cx="94" cy="36" rx="15" ry="9" transform="rotate(-18 94 36)"/><ellipse cx="126" cy="36" rx="15" ry="9" transform="rotate(18 126 36)"/><circle cx="110" cy="40" r="7"/></g>
  </svg>`
};

// Crisp Hand-Crafted Product & Resource Icons (Zero Emojis)
const ITEM_ICONS_SVG = {
  cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="42" rx="22" ry="30" transform="rotate(-24 40 42)" fill="#8C4218" stroke="#4A1E0A" stroke-width="3"/><path d="M26,26 Q42,40 54,58 M34,18 Q48,34 60,50" fill="none" stroke="#59260C" stroke-width="2.5"/><ellipse cx="31" cy="30" rx="5" ry="10" transform="rotate(-24 31 30)" fill="#E9A263" opacity="0.65"/></svg>`,
  cinnamon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g stroke="#59280B" stroke-width="2.8"><rect x="18" y="14" width="18" height="54" rx="7" transform="rotate(-14 27 40)" fill="#C96B1B"/><rect x="42" y="14" width="18" height="54" rx="7" transform="rotate(14 51 40)" fill="#B85D19"/><rect x="30" y="12" width="20" height="58" rx="8" fill="#D97B2B"/></g><rect x="20" y="38" width="40" height="10" rx="4" fill="#C1121F" stroke="#781016" stroke-width="2"/></svg>`,
  candycane: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><pattern id="cs" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="12" height="12" fill="#FFF"/><rect width="6" height="12" fill="#D62828"/></pattern></defs><path d="M32,68 L32,28 C32,12 56,12 56,28" fill="none" stroke="#8C1D1D" stroke-width="17" stroke-linecap="round"/><path d="M32,68 L32,28 C32,12 56,12 56,28" fill="none" stroke="url(#cs)" stroke-width="12" stroke-linecap="round"/></svg>`,
  egg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="eg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#FFFDF7"/><stop offset="70%" stop-color="#FDE6B8"/><stop offset="100%" stop-color="#D9A86C"/></radialGradient></defs><path d="M40,12 C56,12 64,36 64,50 C64,64 53,70 40,70 C27,70 16,64 16,50 C16,36 24,12 40,12Z" fill="url(#eg)" stroke="#8C5A2B" stroke-width="3"/><ellipse cx="31" cy="34" rx="5" ry="10" transform="rotate(-15 31 34)" fill="#FFFFFF" opacity="0.8"/></svg>`,
  wool: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="#F8FAFC" stroke="#7B96B2" stroke-width="3"><circle cx="28" cy="44" r="16"/><circle cx="52" cy="44" r="16"/><circle cx="40" cy="30" r="18"/><circle cx="40" cy="52" r="17"/></g><circle cx="38" cy="42" r="18" fill="#FFFFFF"/></svg>`,
  starmilk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M30,14 L50,14 L52,24 L60,36 L60,64 C60,68 56,70 50,70 L30,70 C24,70 20,68 20,64 L20,36 L28,24Z" fill="#FEF9C3" stroke="#92400E" stroke-width="3" stroke-linejoin="round"/><rect x="27" y="10" width="26" height="8" rx="3" fill="#C1121F" stroke="#781016" stroke-width="2"/><polygon points="40,34 44,44 54,44 46,50 49,60 40,54 31,60 34,50 26,44 36,44" fill="#FACC15" stroke="#B45309" stroke-width="1.8"/></svg>`,
  butterplaetzchen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,10 49,28 69,30 54,44 58,64 40,54 22,64 26,44 11,30 31,28" fill="#F5C469" stroke="#8C4E1B" stroke-width="3.2" stroke-linejoin="round"/><circle cx="40" cy="40" r="9" fill="#C1121F" stroke="#781016" stroke-width="1.8"/></svg>`,
  waffles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="42" r="28" fill="#E6A148" stroke="#7C3F12" stroke-width="3.2"/><g stroke="#9A531C" stroke-width="2.6"><line x1="22" y1="30" x2="58" y2="30"/><line x1="18" y1="42" x2="62" y2="42"/><line x1="22" y1="54" x2="58" y2="54"/><line x1="28" y1="22" x2="28" y2="62"/><line x1="40" y1="18" x2="40" y2="66"/><line x1="52" y1="22" x2="52" y2="62"/></g><circle cx="40" cy="42" r="10" fill="#FFFDF7" stroke="#CBD5E1" stroke-width="1.8"/><circle cx="40" cy="40" r="4.5" fill="#C1121F"/></svg>`,
  lebkuchen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="#B35C22" stroke="#59280B" stroke-width="3" stroke-linejoin="round"><circle cx="40" cy="22" r="13"/><path d="M27,34 L14,42 L19,50 L29,44 L29,56 L22,68 L32,71 L40,58 L48,71 L58,68 L51,56 L51,44 L61,50 L66,42 L53,34Z"/></g><circle cx="35" cy="20" r="2.3" fill="#FFF"/><circle cx="45" cy="20" r="2.3" fill="#FFF"/><path d="M35,26 Q40,31 45,26" fill="none" stroke="#FFF" stroke-width="2.2" stroke-linecap="round"/><circle cx="40" cy="42" r="3" fill="#DC2626"/><circle cx="40" cy="51" r="3" fill="#16A34A"/></svg>`,
  stollen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M12,50 C14,24 66,24 68,50 C68,62 56,66 40,66 C24,66 12,62 12,50Z" fill="#C97B36" stroke="#6B3710" stroke-width="3"/><path d="M16,46 C18,26 62,26 64,46 C54,52 26,52 16,46Z" fill="#FFFDF9" stroke="#CBD5E1" stroke-width="1.8"/><circle cx="32" cy="42" r="3.5" fill="#DC2626"/><circle cx="48" cy="40" r="3.5" fill="#16A34A"/></svg>`,
  winter_punch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,54 56,54" fill="none" stroke="#B45309" stroke-width="6.5" stroke-linecap="round"/><path d="M18,28 L58,28 L54,64 C54,68 48,70 38,70 C28,70 22,68 22,64Z" fill="#FFFDF7" stroke="#9A3412" stroke-width="3"/><ellipse cx="38" cy="28" rx="19" ry="8" fill="#B91C1C" stroke="#7F1D1D" stroke-width="2"/><rect x="44" y="10" width="6" height="22" rx="3" transform="rotate(18 47 20)" fill="#B85D19" stroke="#592608" stroke-width="1.8"/></svg>`,
  matcha_latte: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,54 56,54" fill="none" stroke="#D1D5DB" stroke-width="6.5" stroke-linecap="round"/><path d="M18,28 L58,28 L54,64 C54,68 48,70 38,70 C28,70 22,68 22,64Z" fill="#FFFDF7" stroke="#64748B" stroke-width="3"/><ellipse cx="38" cy="28" rx="19" ry="8" fill="#6BBF59" stroke="#2E7D32" stroke-width="2"/><path d="M38,32 C32,27 32,23 36,24 C38,25 38,26 38,26 C38,26 38,25 40,24 C44,23 44,27 38,32Z" fill="#FFFFFF"/></svg>`,
  hot_cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,54 56,54" fill="none" stroke="#B91C1C" stroke-width="6.5" stroke-linecap="round"/><path d="M18,30 L58,30 L54,64 C54,68 48,70 38,70 C28,70 22,68 22,64Z" fill="#C1121F" stroke="#781016" stroke-width="3"/><path d="M22,30 Q26,16 38,18 Q48,12 54,30Z" fill="#FFFDF9" stroke="#CBD5E1" stroke-width="2"/></svg>`,
  cinnamon_tea: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M54,42 C68,36 68,58 54,56" fill="none" stroke="#9A3412" stroke-width="5.5" stroke-linecap="round"/><path d="M24,48 L12,38 L16,32 L26,40Z" fill="#C2410C" stroke="#7C2D12" stroke-width="2"/><ellipse cx="40" cy="50" rx="22" ry="18" fill="#D95B16" stroke="#7C2D12" stroke-width="3"/><ellipse cx="40" cy="34" rx="13" ry="6" fill="#FDBA74" stroke="#7C2D12" stroke-width="2"/></svg>`,
  berry_tart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="50" rx="28" ry="16" fill="#D98A36" stroke="#78350F" stroke-width="3"/><ellipse cx="40" cy="44" rx="24" ry="13" fill="#FFFDF5" stroke="#CBD5E1" stroke-width="2"/><circle cx="32" cy="40" r="6" fill="#C1121F"/><circle cx="46" cy="38" r="6" fill="#DC2626"/><circle cx="40" cy="47" r="6" fill="#991B1B"/></svg>`,
  tiramisu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="14" y="48" width="52" height="16" rx="4" fill="#D99B52" stroke="#6B3710" stroke-width="2.8"/><rect x="14" y="34" width="52" height="14" rx="3" fill="#FFFDF5" stroke="#B89B74" stroke-width="2.2"/><rect x="14" y="24" width="52" height="12" rx="4" fill="#7A4224" stroke="#3D1808" stroke-width="2.8"/></svg>`,
  matcha_tiramisu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="14" y="48" width="52" height="16" rx="4" fill="#E6B87A" stroke="#784421" stroke-width="2.8"/><rect x="14" y="34" width="52" height="14" rx="3" fill="#FFFDF5" stroke="#99C29B" stroke-width="2.2"/><rect x="14" y="24" width="52" height="12" rx="4" fill="#4D9F3B" stroke="#1B4D20" stroke-width="2.8"/></svg>`,
  wool_scarf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M18,28 Q40,42 62,28 L64,42 Q40,56 16,42Z" fill="#B91C1C" stroke="#5C1010" stroke-width="3"/><path d="M44,36 L58,68 L42,70 L32,42Z" fill="#B91C1C" stroke="#5C1010" stroke-width="2.8"/><path d="M38,52 L52,49 M41,61 L55,58 M28,36 L28,46 M50,36 L50,46" stroke="#FACC15" stroke-width="4"/></svg>`,
  cookie_tin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="54" rx="28" ry="14" fill="#15803D" stroke="#0F4726" stroke-width="3"/><rect x="12" y="34" width="56" height="20" fill="#16A34A" stroke="#0F4726" stroke-width="3"/><ellipse cx="40" cy="34" rx="28" ry="14" fill="#22C55E" stroke="#0F4726" stroke-width="3"/><polygon points="40,24 43,31 50,31 44,35 46,42 40,38 34,42 36,35 30,31 37,31" fill="#FACC15" stroke="#92400E" stroke-width="1.6"/></svg>`,
  mega_gift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="16" y="30" width="48" height="38" rx="6" fill="#C1121F" stroke="#781016" stroke-width="3"/><rect x="12" y="24" width="56" height="12" rx="4" fill="#DC2626" stroke="#781016" stroke-width="3"/><rect x="34" y="24" width="12" height="44" fill="#FACC15" stroke="#92400E" stroke-width="2.2"/><ellipse cx="30" cy="18" rx="12" ry="7" transform="rotate(-20 30 18)" fill="#FACC15" stroke="#92400E" stroke-width="2.2"/><ellipse cx="50" cy="18" rx="12" ry="7" transform="rotate(20 50 18)" fill="#FACC15" stroke="#92400E" stroke-width="2.2"/></svg>`,
  coin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#FACC15" stroke="#92400E" stroke-width="4"/><circle cx="32" cy="32" r="20" fill="#FEF08A" stroke="#D97706" stroke-width="2"/><polygon points="32,16 36,27 48,27 38,34 42,46 32,39 22,46 26,34 16,27 28,27" fill="#D97706"/></svg>`
};

// Custom Vector UI Icon Set (Commercial Minimalism · Zero Emojis)
export const UI_ICONS = {
  shop: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h20l-2-6H6l-2 6z" fill="#D62828" stroke="#5C1414"/><path d="M6 11v12h16V11" fill="#FFF7E6" stroke="#5C2D12"/><path d="M11 23v-7h6v7" fill="#C97B36" stroke="#5C2D12"/><path d="M4 11c0 2 1.8 3 3.3 3s3.3-1 3.3-3c0 2 1.8 3 3.4 3s3.4-1 3.4-3c0 2 1.8 3 3.3 3s3.3-1 3.3-3" fill="#FFFDF7" stroke="#5C1414"/></svg>`,
  barn: `<svg viewBox="0 0 28 28" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13L14 5l10 8v10H4V13z" fill="#B91C1C" stroke="#5C1414"/><path d="M2.5 13.5L14 4.5l11.5 9" stroke="#FFFDF7" stroke-width="2.6"/><rect x="9.5" y="14.5" width="9" height="8.5" rx="1" fill="#FFF3D6" stroke="#5C2D12"/><path d="M9.5 14.5l9 8.5M18.5 14.5l-9 8.5" stroke="#9A531C" stroke-width="1.6"/></svg>`,
  orders: `<svg viewBox="0 0 28 28" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="18" height="19" rx="3" fill="#FFF7E6" stroke="#5C2D12"/><rect x="10" y="3" width="8" height="4" rx="1.5" fill="#D97706" stroke="#5C2D12"/><path d="M9 12h10M9 16h10M9 20h6" stroke="#7C4A1E"/></svg>`,
  mail: `<svg viewBox="0 0 28 28" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="21" height="15" rx="3" fill="#FFF7E6" stroke="#5C2D12"/><path d="M4.5 8l9.5 7 9.5-7" stroke="#7C4A1E"/><circle cx="14" cy="15" r="3" fill="#C1121F" stroke="#5C1414" stroke-width="1.5"/></svg>`,
  move: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#FEF08A" stroke="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>`,
  dusk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 17h16" /><path d="M7 17a5 5 0 0 1 10 0" fill="#FDBA74"/><path d="M12 5v3M6.3 9.3l2 2M17.7 9.3l-2 2"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A7.5 7.5 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z" fill="#FEF08A"/></svg>`,
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16V4z" fill="currentColor" opacity="0.32"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>`,
  scroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2z" fill="#FEF3C7"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>`,
  coin: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FACC15" stroke="#92400E" stroke-width="2"/><polygon points="12,5.5 13.8,10 18.5,10 14.8,12.8 16.2,17.5 12,14.7 7.8,17.5 9.2,12.8 5.5,10 10.2,10" fill="#B45309"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><polygon points="12,3 14.8,9 21.5,9.6 16.4,14 18,20.5 12,17 6,20.5 7.6,14 2.5,9.6 9.2,9" fill="#FACC15" stroke="#92400E" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="9" width="12" height="8" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/></svg>`,
  check: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>`,
  refresh: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16 4v4h-4"/></svg>`,
  land: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3,6 9,4 15,6 21,4 21,18 15,20 9,18 3,20" fill="#E6F4EA"/><path d="M9 4v14M15 6v14"/></svg>`,
  heart: `<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.7-9.2-9C1.5 8 4 4.8 7.5 4.8c2 0 3.6 1.1 4.5 2.6.9-1.5 2.5-2.6 4.5-2.6 3.5 0 6 3.2 4.7 6.7-1.7 4.3-9.2 9-9.2 9z" fill="#DC2626" stroke="#7F1D1D" stroke-width="1.6"/></svg>`,
  wheat: `<svg viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2" stroke-linecap="round"><path d="M12 21V5"/><path d="M12 16c-3-1-4-3-4-5 2 0 4 1 4 3M12 12c-3-1-4-3-4-5 2 0 4 1 4 3M12 16c3-1 4-3 4-5-2 0-4 1-4 3M12 12c3-1 4-3 4-5-2 0-4 1-4 3" fill="#FACC15"/></svg>`,
  bakery: `<svg viewBox="0 0 24 24" fill="none" stroke="#78350F" stroke-width="2" stroke-linecap="round"><path d="M4 18h16v-5a8 8 0 0 0-16 0v5z" fill="#E6A148"/><path d="M9 11l-1 4M12 10v5M15 11l1 4"/></svg>`,
  village: `<svg viewBox="0 0 24 24" fill="none" stroke="#5C2D12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3v-9z" fill="#FFF7E6"/><rect x="10" y="13" width="4" height="7" fill="#C97B36"/></svg>`,
  chest: `<svg viewBox="0 0 24 24" fill="none" stroke="#5C2D12" stroke-width="2" stroke-linejoin="round"><rect x="3" y="9" width="18" height="11" rx="2" fill="#B86B32"/><path d="M3 10c0-3.5 18-3.5 18 0" fill="#D97706"/><rect x="10" y="11" width="4" height="5" rx="1" fill="#FACC15"/></svg>`,
  scythe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19L16 8"/><path d="M16 8C19.5 6 20.5 10.5 16 14C13.5 11.5 13 9.5 16 8Z" fill="currentColor" opacity="0.9"/><path d="M8 16L6 14"/></svg>`
};

function svgToDataUrl(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export class SpriteManager {
  constructor() {
    this.images = {};
    this.iconUrls = {};
    this.ready = false;
  }

  async loadAll(onProgress = null) {
    const embedded = window.__WINTERHOF_ASSETS__ || {};
    const total = WEBP_SPRITES.length + Object.keys(VECTOR_SPRITES_SVG).length + Object.keys(ITEM_ICONS_SVG).length;
    let done = 0;
    const step = () => {
      done++;
      if (onProgress) onProgress(Math.min(1, done / total));
    };

    const jobs = [];

    for (const key of WEBP_SPRITES) {
      const src = embedded[key] || `./assets/sprites/${key}.webp`;
      this.iconUrls[key] = src;
      jobs.push(loadImg(src).then((img) => { if (img) this.images[key] = img; step(); }));
    }

    for (const [key, svg] of Object.entries(VECTOR_SPRITES_SVG)) {
      const url = svgToDataUrl(svg);
      this.iconUrls[key] = url;
      jobs.push(loadImg(url).then((img) => { if (img) this.images[key] = img; step(); }));
    }

    for (const [key, svg] of Object.entries(ITEM_ICONS_SVG)) {
      const url = svgToDataUrl(svg);
      this.iconUrls[key] = url;
      jobs.push(loadImg(url).then((img) => { if (img) this.images['icon_' + key] = img; step(); }));
    }

    await Promise.all(jobs);

    // Alias 3D WebP crop sprites as crisp UI icons
    const aliases = {
      wheat: 'crop_wheat',
      berries: 'crop_berries',
      matcha: 'crop_matcha'
    };
    for (const [alias, target] of Object.entries(aliases)) {
      if (this.images[target]) {
        this.images[alias] = this.images[target];
        this.images['icon_' + alias] = this.images[target];
        this.iconUrls[alias] = this.iconUrls[target];
      }
    }

    this.ready = true;
  }

  get(name) {
    return this.images[name] || null;
  }

  getIconImg(itemId) {
    return this.images['icon_' + itemId] || this.images[itemId] || null;
  }

  getIconUrl(id) {
    return this.iconUrls[id] || '';
  }

  getUiIcon(name) {
    return UI_ICONS[name] || '';
  }
}

export const sprites = new SpriteManager();
