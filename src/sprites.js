// ============================================================================
// WINTERHOF & ZAUBERHERBST — 28 Hand-Painted 3D WebP Sprites + Glossy Icons
// ============================================================================

const WEBP_SPRITES = [
  'winter_chalet',
  'christmas_bakery',
  'punch_stand',
  'patisserie_house',
  'gift_workshop',
  'christmas_tree',
  'autumn_tree_landmark',
  'reindeer_sleigh',
  'wishlist_board',
  'gift_mailbox',
  'animal_chicken',
  'animal_sheep',
  'animal_reindeer',
  'animal_owl',
  'snow_field_plot',
  'crop_wheat',
  'crop_berries',
  'crop_pumpkin',
  'crop_matcha',
  'crop_mushroom',
  'deco_pine',
  'deco_autumn_tree',
  'deco_snowman',
  'deco_lantern',
  'deco_pumpkin',
  'deco_ghost',
  'deco_sorting_hat',
  'deco_cauldron'
];

// Remaining crisp glossy 2.5D vector sprites (for props not yet converted to WebP)
const VECTOR_SPRITES_SVG = {
  golden_snitch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90">
    <defs><radialGradient id="snG" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#FFFBEB"/><stop offset="45%" stop-color="#FACC15"/><stop offset="100%" stop-color="#B45309"/></radialGradient></defs>
    <path d="M56,46 C26,12 4,14 10,36 C16,52 38,52 56,50Z" fill="#FFFDF7" stroke="#CBD5E1" stroke-width="2.5" opacity="0.92"/>
    <path d="M84,46 C114,12 136,14 130,36 C124,52 102,52 84,50Z" fill="#FFFDF7" stroke="#CBD5E1" stroke-width="2.5" opacity="0.92"/>
    <circle cx="70" cy="48" r="18" fill="url(#snG)" stroke="#92400E" stroke-width="3"/>
    <path d="M56,42 Q70,54 84,42 M58,56 Q70,48 82,56" fill="none" stroke="#92400E" stroke-width="1.8" opacity="0.65"/>
    <ellipse cx="64" cy="41" rx="5" ry="3.5" fill="#FFFFFF" opacity="0.75"/>
  </svg>`,
  crop_cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190">
    <defs>
      <radialGradient id="leafG" cx="35%" cy="25%" r="70%"><stop offset="0%" stop-color="#5DBB4D"/><stop offset="65%" stop-color="#2E7D32"/><stop offset="100%" stop-color="#1B4D20"/></radialGradient>
      <radialGradient id="podG" cx="32%" cy="28%" r="72%"><stop offset="0%" stop-color="#D9822B"/><stop offset="50%" stop-color="#8C4218"/><stop offset="100%" stop-color="#4A1E0A"/></radialGradient>
    </defs>
    <g stroke="#2B1A10" stroke-width="3">
      <ellipse cx="110" cy="134" rx="82" ry="42" fill="#1F5B24"/>
      <ellipse cx="60" cy="112" rx="34" ry="26" fill="url(#leafG)"/>
      <ellipse cx="160" cy="112" rx="34" ry="26" fill="url(#leafG)"/>
      <ellipse cx="110" cy="94" rx="48" ry="34" fill="url(#leafG)"/>
    </g>
    <g stroke="#3A1808" stroke-width="3">
      <ellipse cx="68" cy="114" rx="18" ry="25" transform="rotate(-18 68 114)" fill="url(#podG)"/>
      <ellipse cx="150" cy="112" rx="18" ry="25" transform="rotate(20 150 112)" fill="url(#podG)"/>
      <ellipse cx="110" cy="100" rx="21" ry="29" fill="url(#podG)"/>
      <ellipse cx="112" cy="138" rx="17" ry="22" fill="url(#podG)"/>
    </g>
  </svg>`,
  crop_cinnamon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190">
    <defs><linearGradient id="barkG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#E89C54"/><stop offset="45%" stop-color="#B85D19"/><stop offset="100%" stop-color="#6B2E08"/></linearGradient></defs>
    <ellipse cx="110" cy="138" rx="82" ry="38" fill="#226832" stroke="#143E1D" stroke-width="3"/>
    <g stroke="#4A1F06" stroke-width="3">
      <rect x="64" y="54" width="24" height="92" rx="10" transform="rotate(-18 76 105)" fill="url(#barkG)"/>
      <rect x="132" y="54" width="24" height="92" rx="10" transform="rotate(16 144 104)" fill="url(#barkG)"/>
      <rect x="95" y="38" width="30" height="106" rx="12" fill="url(#barkG)"/>
    </g>
    <path d="M84,118 Q110,130 136,118 L136,130 Q110,142 84,130Z" fill="#D62828" stroke="#6B0F0F" stroke-width="2.5"/>
    <polygon points="110,126 117,136 129,135 121,144 126,155 114,150 104,157 106,145 96,138 107,136" fill="#FFD470" stroke="#5A2306" stroke-width="2.2"/>
  </svg>`,
  crop_candycane: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200">
    <defs><pattern id="ccStripe" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="18" height="18" fill="#FFFDF9"/><rect width="9" height="18" fill="#E62937"/></pattern></defs>
    <ellipse cx="110" cy="154" rx="78" ry="32" fill="#E6F4FF" stroke="#99C2E8" stroke-width="2.5"/>
    <g transform="translate(64,148) rotate(-14)"><path d="M0,0 L0,-76 C0,-102 -36,-102 -36,-76" fill="none" stroke="#7F1D1D" stroke-width="22" stroke-linecap="round"/><path d="M0,0 L0,-76 C0,-102 -36,-102 -36,-76" fill="none" stroke="url(#ccStripe)" stroke-width="17" stroke-linecap="round"/></g>
    <g transform="translate(156,148) rotate(14)"><path d="M0,0 L0,-76 C0,-102 36,-102 36,-76" fill="none" stroke="#7F1D1D" stroke-width="22" stroke-linecap="round"/><path d="M0,0 L0,-76 C0,-102 36,-102 36,-76" fill="none" stroke="url(#ccStripe)" stroke-width="17" stroke-linecap="round"/></g>
    <g transform="translate(106,158)"><path d="M0,0 L0,-98 C0,-130 44,-130 44,-96" fill="none" stroke="#7F1D1D" stroke-width="28" stroke-linecap="round"/><path d="M0,0 L0,-98 C0,-130 44,-130 44,-96" fill="none" stroke="url(#ccStripe)" stroke-width="22" stroke-linecap="round"/></g>
  </svg>`,
  deco_spider: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 200">
    <path d="M26,184 L36,42 Q95,22 154,42 L164,184" fill="none" stroke="#6B3A18" stroke-width="11" stroke-linecap="round"/>
    <g stroke="#E2E8F0" stroke-width="2.2" fill="none" opacity="0.9">
      <line x1="36" y1="44" x2="156" y2="146"/><line x1="154" y1="44" x2="34" y2="146"/>
      <line x1="95" y1="30" x2="95" y2="156"/><line x1="32" y1="95" x2="158" y2="95"/>
      <circle cx="95" cy="95" r="22"/><circle cx="95" cy="95" r="42"/><circle cx="95" cy="95" r="60"/>
    </g>
    <g stroke="#111827" stroke-width="3" stroke-linecap="round">
      <path d="M74,94 Q54,82 48,100 M74,102 Q52,102 48,118 M78,110 Q60,118 58,132" fill="none" stroke-width="4.5"/>
      <path d="M116,94 Q136,82 142,100 M116,102 Q138,102 142,118 M112,110 Q130,118 132,132" fill="none" stroke-width="4.5"/>
      <circle cx="95" cy="96" r="24" fill="#312E4A"/>
    </g>
    <circle cx="86" cy="94" r="7" fill="#FFF"/><circle cx="104" cy="94" r="7" fill="#FFF"/>
    <circle cx="87" cy="94" r="4" fill="#111827"/><circle cx="103" cy="94" r="4" fill="#111827"/>
    <circle cx="85" cy="92" r="1.8" fill="#FFF"/><circle cx="101" cy="92" r="1.8" fill="#FFF"/>
    <path d="M90,106 Q95,111 100,106" fill="none" stroke="#FDA4AF" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  deco_floating_candles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 230">
    <g stroke="#92400E" stroke-width="2.2">
      <rect x="34" y="100" width="16" height="54" rx="4" fill="#FFFBEB"/><rect x="64" y="54" width="18" height="62" rx="4" fill="#FFFDF5"/>
      <rect x="92" y="84" width="16" height="58" rx="4" fill="#FFFBEB"/><rect x="122" y="42" width="18" height="60" rx="4" fill="#FFFDF5"/>
      <rect x="142" y="110" width="15" height="48" rx="4" fill="#FFFBEB"/>
    </g>
    <g fill="#FACC15" stroke="#EA580C" stroke-width="1.5">
      <path d="M42,80 Q48,92 42,98 Q36,92 42,80Z"/><path d="M73,32 Q80,46 73,52 Q66,46 73,32Z"/>
      <path d="M100,64 Q106,76 100,82 Q94,76 100,64Z"/><path d="M131,20 Q138,34 131,40 Q124,34 131,20Z"/>
      <path d="M149,92 Q155,103 149,108 Q143,103 149,92Z"/>
    </g>
  </svg>`,
  deco_broom: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 210">
    <g transform="rotate(18 95 110)">
      <path d="M96,18 C100,56 90,94 94,132" fill="none" stroke="#5C280B" stroke-width="14" stroke-linecap="round"/>
      <path d="M96,18 C100,56 90,94 94,132" fill="none" stroke="#A0522D" stroke-width="8" stroke-linecap="round"/>
      <path d="M94,128 C66,144 58,184 70,196 L122,196 C134,184 124,144 94,128Z" fill="#D99848" stroke="#6B3A10" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="81" y="128" width="26" height="10" rx="4" fill="#FACC15" stroke="#92400E" stroke-width="2.5"/>
    </g>
  </svg>`,
  deco_giftpile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180">
    <g stroke="#5C1111" stroke-width="3" stroke-linejoin="round">
      <polygon points="36,104 96,76 154,104 94,132" fill="#EF4444"/><polygon points="36,104 94,132 94,168 36,140" fill="#DC2626"/><polygon points="154,104 94,132 94,168 154,140" fill="#B91C1C"/>
      <polygon points="62,92 78,84 134,112 118,120" fill="#FACC15" stroke="#92400E" stroke-width="2"/>
    </g>
    <g stroke="#0F4726" stroke-width="3" stroke-linejoin="round">
      <polygon points="66,58 106,40 146,58 106,76" fill="#22C55E"/><polygon points="66,58 106,76 106,108 66,90" fill="#16A34A"/><polygon points="146,58 106,76 106,108 146,90" fill="#15803D"/>
    </g>
    <g fill="#EF4444" stroke="#7F1D1D" stroke-width="2.5">
      <ellipse cx="92" cy="40" rx="18" ry="11" transform="rotate(-22 92 40)"/><ellipse cx="120" cy="40" rx="18" ry="11" transform="rotate(22 120 40)"/><circle cx="106" cy="44" r="8" fill="#F87171"/>
    </g>
    <g stroke="#1E3A8A" stroke-width="2.8" stroke-linejoin="round">
      <polygon points="122,126 150,114 178,126 150,138" fill="#3B82F6"/><polygon points="122,126 150,138 150,164 122,152" fill="#2563EB"/><polygon points="178,126 150,138 150,164 178,152" fill="#1D4ED8"/>
    </g>
  </svg>`,
  deco_bench: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 175">
    <g stroke="#1E293B" stroke-width="7" stroke-linecap="round"><line x1="48" y1="98" x2="42" y2="148"/><line x1="88" y1="118" x2="84" y2="162"/><line x1="156" y1="86" x2="152" y2="134"/></g>
    <g fill="#B86B32" stroke="#4A2408" stroke-width="3" stroke-linejoin="round">
      <polygon points="44,68 148,26 156,42 52,84"/><polygon points="50,86 154,44 162,60 58,102"/><polygon points="42,108 148,66 174,80 68,122"/>
    </g>
    <path d="M62,76 L104,59 L126,86 L102,126 L68,118 Z" fill="#D62828" stroke="#7F1D1D" stroke-width="2.8"/>
    <rect x="134" y="64" width="18" height="22" rx="3" fill="#FDE047" stroke="#374151" stroke-width="2.8"/><polygon points="130,64 143,52 156,64" fill="#374151"/>
  </svg>`,
  deco_lightarch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 230">
    <g fill="#8C4818" stroke="#4A2408" stroke-width="3.5"><rect x="36" y="100" width="22" height="114" rx="6"/><rect x="162" y="100" width="22" height="114" rx="6"/></g>
    <path d="M46,112 C46,18 174,18 174,112" fill="none" stroke="#13421E" stroke-width="36" stroke-linecap="round"/>
    <path d="M46,112 C46,18 174,18 174,112" fill="none" stroke="#2D8A42" stroke-width="26" stroke-linecap="round"/>
    <g fill="#FEF08A" stroke="#F59E0B" stroke-width="2"><circle cx="52" cy="96" r="6"/><circle cx="66" cy="64" r="6"/><circle cx="88" cy="46" r="6"/><circle cx="110" cy="40" r="7"/><circle cx="132" cy="46" r="6"/><circle cx="154" cy="64" r="6"/><circle cx="168" cy="96" r="6"/></g>
    <g fill="#E62937" stroke="#7F1D1D" stroke-width="2.5"><ellipse cx="94" cy="36" rx="16" ry="10" transform="rotate(-18 94 36)"/><ellipse cx="126" cy="36" rx="16" ry="10" transform="rotate(18 126 36)"/><circle cx="110" cy="40" r="8"/></g>
  </svg>`
};

// Glossy Product & Resource Icons
const ITEM_ICONS_SVG = {
  cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="42" rx="22" ry="30" transform="rotate(-24 40 42)" fill="#8C4218" stroke="#3D1808" stroke-width="4"/><path d="M26,26 Q42,40 54,58 M34,18 Q48,34 60,50" fill="none" stroke="#59260C" stroke-width="3"/><ellipse cx="31" cy="30" rx="5" ry="10" transform="rotate(-24 31 30)" fill="#E9A263" opacity="0.7"/></svg>`,
  cinnamon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g stroke="#4A1F06" stroke-width="3.5"><rect x="18" y="14" width="18" height="54" rx="7" transform="rotate(-14 27 40)" fill="#C96B1B"/><rect x="42" y="14" width="18" height="54" rx="7" transform="rotate(14 51 40)" fill="#B85D19"/><rect x="30" y="12" width="20" height="58" rx="8" fill="#D97B2B"/></g><rect x="20" y="38" width="40" height="10" rx="4" fill="#E62937" stroke="#7F1D1D" stroke-width="2.5"/></svg>`,
  candycane: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><pattern id="cs" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="12" height="12" fill="#FFF"/><rect width="6" height="12" fill="#E62937"/></pattern></defs><path d="M32,68 L32,28 C32,12 56,12 56,28" fill="none" stroke="#7F1D1D" stroke-width="18" stroke-linecap="round"/><path d="M32,68 L32,28 C32,12 56,12 56,28" fill="none" stroke="url(#cs)" stroke-width="13" stroke-linecap="round"/></svg>`,
  egg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="eg" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#FFFDF7"/><stop offset="70%" stop-color="#FDE6B8"/><stop offset="100%" stop-color="#D9A86C"/></radialGradient></defs><path d="M40,12 C56,12 64,36 64,50 C64,64 53,70 40,70 C27,70 16,64 16,50 C16,36 24,12 40,12Z" fill="url(#eg)" stroke="#784421" stroke-width="3.5"/><ellipse cx="31" cy="34" rx="5" ry="10" transform="rotate(-15 31 34)" fill="#FFFFFF" opacity="0.8"/></svg>`,
  wool: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="#F8FAFC" stroke="#7B96B2" stroke-width="3.5"><circle cx="28" cy="44" r="16"/><circle cx="52" cy="44" r="16"/><circle cx="40" cy="30" r="18"/><circle cx="40" cy="52" r="17"/></g><circle cx="38" cy="42" r="18" fill="#FFFFFF"/></svg>`,
  starmilk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M30,14 L50,14 L52,24 L60,36 L60,64 C60,68 56,70 50,70 L30,70 C24,70 20,68 20,64 L20,36 L28,24Z" fill="#FEF9C3" stroke="#92400E" stroke-width="3.5" stroke-linejoin="round"/><rect x="27" y="10" width="26" height="8" rx="3" fill="#E62937" stroke="#7F1D1D" stroke-width="2.5"/><polygon points="40,34 44,44 54,44 46,50 49,60 40,54 31,60 34,50 26,44 36,44" fill="#FACC15" stroke="#B45309" stroke-width="2"/></svg>`,
  magic_honey: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="18" y="24" width="44" height="44" rx="16" fill="#F59E0B" stroke="#78350F" stroke-width="3.5"/><rect x="24" y="14" width="32" height="12" rx="5" fill="#B91C1C" stroke="#5C1010" stroke-width="2.8"/><path d="M22,36 Q32,46 40,36 Q48,48 58,36 L58,28 L22,28Z" fill="#FDE047"/><polygon points="40,44 43,51 50,51 44,55 46,62 40,58 34,62 36,55 30,51 37,51" fill="#FFFBEB"/></svg>`,
  butterplaetzchen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,10 49,28 69,30 54,44 58,64 40,54 22,64 26,44 11,30 31,28" fill="#F5C469" stroke="#8C4E1B" stroke-width="3.8" stroke-linejoin="round"/><circle cx="40" cy="40" r="9" fill="#E62937" stroke="#991B1B" stroke-width="2"/></svg>`,
  waffles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="42" r="28" fill="#E6A148" stroke="#7C3F12" stroke-width="3.8"/><g stroke="#9A531C" stroke-width="3"><line x1="22" y1="30" x2="58" y2="30"/><line x1="18" y1="42" x2="62" y2="42"/><line x1="22" y1="54" x2="58" y2="54"/><line x1="28" y1="22" x2="28" y2="62"/><line x1="40" y1="18" x2="40" y2="66"/><line x1="52" y1="22" x2="52" y2="62"/></g><circle cx="40" cy="42" r="10" fill="#FFFDF7" stroke="#CBD5E1" stroke-width="2"/><circle cx="40" cy="40" r="4.5" fill="#DC2626"/></svg>`,
  lebkuchen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="#B35C22" stroke="#59280B" stroke-width="3.5" stroke-linejoin="round"><circle cx="40" cy="22" r="13"/><path d="M27,34 L14,42 L19,50 L29,44 L29,56 L22,68 L32,71 L40,58 L48,71 L58,68 L51,56 L51,44 L61,50 L66,42 L53,34Z"/></g><circle cx="35" cy="20" r="2.3" fill="#FFF"/><circle cx="45" cy="20" r="2.3" fill="#FFF"/><path d="M35,26 Q40,31 45,26" fill="none" stroke="#FFF" stroke-width="2.3" stroke-linecap="round"/><circle cx="40" cy="42" r="3" fill="#EF233C"/><circle cx="40" cy="51" r="3" fill="#22C55E"/></svg>`,
  stollen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M12,50 C14,24 66,24 68,50 C68,62 56,66 40,66 C24,66 12,62 12,50Z" fill="#C97B36" stroke="#6B3710" stroke-width="3.5"/><path d="M16,46 C18,26 62,26 64,46 C54,52 26,52 16,46Z" fill="#FFFDF9" stroke="#CBD5E1" stroke-width="2"/><circle cx="32" cy="42" r="3.5" fill="#DC2626"/><circle cx="48" cy="40" r="3.5" fill="#16A34A"/></svg>`,
  matcha_latte: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,54 56,54" fill="none" stroke="#D1D5DB" stroke-width="7" stroke-linecap="round"/><path d="M18,28 L58,28 L54,64 C54,68 48,70 38,70 C28,70 22,68 22,64Z" fill="#FFFDF7" stroke="#64748B" stroke-width="3.5"/><ellipse cx="38" cy="28" rx="19" ry="8" fill="#6BBF59" stroke="#2E7D32" stroke-width="2.5"/><path d="M38,32 C32,27 32,23 36,24 C38,25 38,26 38,26 C38,26 38,25 40,24 C44,23 44,27 38,32Z" fill="#FFFFFF"/></svg>`,
  herbal_tea: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M54,42 C68,36 68,58 54,56" fill="none" stroke="#9A3412" stroke-width="6" stroke-linecap="round"/><path d="M24,48 L12,38 L16,32 L26,40Z" fill="#C2410C" stroke="#7C2D12" stroke-width="2.5"/><ellipse cx="40" cy="50" rx="22" ry="18" fill="#EA580C" stroke="#7C2D12" stroke-width="3.5"/><ellipse cx="40" cy="34" rx="13" ry="6" fill="#FDBA74" stroke="#7C2D12" stroke-width="2.5"/></svg>`,
  butterbeer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,58 56,58" fill="none" stroke="#B45309" stroke-width="7" stroke-linecap="round"/><rect x="20" y="28" width="36" height="40" rx="7" fill="#F59E0B" stroke="#78350F" stroke-width="3.5"/><path d="M18,30 Q24,14 38,16 Q50,10 58,28 Q52,36 42,32 Q32,38 18,30Z" fill="#FFFDF5" stroke="#CBD5E1" stroke-width="2.5"/><polygon points="38,42 40,48 46,48 41,51 43,57 38,54 33,57 35,51 30,48 36,48" fill="#FEF08A"/></svg>`,
  hot_cocoa: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M56,36 C68,36 68,54 56,54" fill="none" stroke="#B91C1C" stroke-width="7" stroke-linecap="round"/><path d="M18,30 L58,30 L54,64 C54,68 48,70 38,70 C28,70 22,68 22,64Z" fill="#DC2626" stroke="#7F1D1D" stroke-width="3.5"/><path d="M22,30 Q26,16 38,18 Q48,12 54,30Z" fill="#FFFDF9" stroke="#CBD5E1" stroke-width="2.5"/></svg>`,
  pumpkin_latte: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M22,28 L58,28 L52,68 L28,68Z" fill="#FB923C" stroke="#7C2D12" stroke-width="3.5" stroke-linejoin="round"/><path d="M22,28 Q40,10 58,28Z" fill="#FFFDF9" stroke="#CBD5E1" stroke-width="2.5"/><rect x="44" y="10" width="7" height="20" rx="3" transform="rotate(18 47 20)" fill="#B85D19" stroke="#592608" stroke-width="2"/></svg>`,
  mushroom_quiche: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="46" rx="30" ry="20" fill="#D98A36" stroke="#78350F" stroke-width="3.5"/><ellipse cx="40" cy="42" rx="24" ry="15" fill="#FDE68A" stroke="#B45309" stroke-width="2"/><ellipse cx="32" cy="40" rx="6" ry="4" fill="#A0522D"/><ellipse cx="48" cy="43" rx="6" ry="4" fill="#A0522D"/></svg>`,
  chocofrog: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="40,10 68,26 60,64 20,64 12,26" fill="#3B2552" stroke="#FACC15" stroke-width="3"/><ellipse cx="40" cy="44" rx="18" ry="14" fill="#6B3418" stroke="#3D1808" stroke-width="2.8"/><circle cx="33" cy="34" r="5" fill="#6B3418" stroke="#3D1808" stroke-width="2.2"/><circle cx="47" cy="34" r="5" fill="#6B3418" stroke="#3D1808" stroke-width="2.2"/><circle cx="33" cy="34" r="2" fill="#FDE047"/><circle cx="47" cy="34" r="2" fill="#FDE047"/></svg>`,
  tiramisu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="14" y="48" width="52" height="16" rx="4" fill="#D99B52" stroke="#6B3710" stroke-width="3"/><rect x="14" y="34" width="52" height="14" rx="3" fill="#FFFDF5" stroke="#B89B74" stroke-width="2.5"/><rect x="14" y="24" width="52" height="12" rx="4" fill="#7A4224" stroke="#3D1808" stroke-width="3"/></svg>`,
  matcha_tiramisu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="14" y="48" width="52" height="16" rx="4" fill="#E6B87A" stroke="#784421" stroke-width="3"/><rect x="14" y="34" width="52" height="14" rx="3" fill="#FFFDF5" stroke="#99C29B" stroke-width="2.5"/><rect x="14" y="24" width="52" height="12" rx="4" fill="#4D9F3B" stroke="#1B4D20" stroke-width="3"/><path d="M52,18 C52,12 62,10 66,14 C64,20 56,22 52,18Z" fill="#65A30D" stroke="#1E5622" stroke-width="2"/></svg>`,
  wool_scarf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path d="M18,28 Q40,42 62,28 L64,42 Q40,56 16,42Z" fill="#B91C1C" stroke="#5C1010" stroke-width="3.5"/><path d="M44,36 L58,68 L42,70 L32,42Z" fill="#B91C1C" stroke="#5C1010" stroke-width="3.2"/><path d="M38,52 L52,49 M41,61 L55,58 M28,36 L28,46 M50,36 L50,46" stroke="#FACC15" stroke-width="4.5"/></svg>`,
  cookie_tin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><ellipse cx="40" cy="54" rx="28" ry="14" fill="#15803D" stroke="#0F4726" stroke-width="3.5"/><rect x="12" y="34" width="56" height="20" fill="#16A34A" stroke="#0F4726" stroke-width="3.5"/><ellipse cx="40" cy="34" rx="28" ry="14" fill="#22C55E" stroke="#0F4726" stroke-width="3.5"/><polygon points="40,24 43,31 50,31 44,35 46,42 40,38 34,42 36,35 30,31 37,31" fill="#FACC15" stroke="#92400E" stroke-width="1.8"/></svg>`,
  mega_gift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect x="16" y="30" width="48" height="38" rx="6" fill="#E62937" stroke="#7F1D1D" stroke-width="3.5"/><rect x="12" y="24" width="56" height="12" rx="4" fill="#EF4444" stroke="#7F1D1D" stroke-width="3.5"/><rect x="34" y="24" width="12" height="44" fill="#FACC15" stroke="#92400E" stroke-width="2.5"/><ellipse cx="30" cy="18" rx="12" ry="7" transform="rotate(-20 30 18)" fill="#FACC15" stroke="#92400E" stroke-width="2.5"/><ellipse cx="50" cy="18" rx="12" ry="7" transform="rotate(20 50 18)" fill="#FACC15" stroke="#92400E" stroke-width="2.5"/></svg>`,
  coin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#FACC15" stroke="#92400E" stroke-width="4"/><circle cx="32" cy="32" r="20" fill="#FEF08A" stroke="#D97706" stroke-width="2"/><polygon points="32,16 36,27 48,27 38,34 42,46 32,39 22,46 26,34 16,27 28,27" fill="#D97706"/></svg>`
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

    // Alias 3D WebP sprites cleanly as UI icons & forest mushroom clusters!
    const aliases = {
      wheat: 'crop_wheat',
      berries: 'crop_berries',
      pumpkin: 'crop_pumpkin',
      matcha: 'crop_matcha',
      mushroom: 'crop_mushroom',
      wild_mushroom: 'crop_mushroom',
      deco_mushrooms: 'crop_mushroom'
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
}

export const sprites = new SpriteManager();
