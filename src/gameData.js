// ============================================================================
// WINTERHOF & ZAUBERHERBST — Complete Hay-Day Depth Game Data
// Seasons: Winter (Weihnachten) & Herbst (Halloween, Schwammerl) + Magic
// ============================================================================

export const GRID_SIZE = 16;

// Expandable land zones (core 2..13 x 2..13 is unlocked at start!)
export const LAND_ZONES = [
  {
    id: 'west_forest',
    name: 'Schwammerl-Wäldchen',
    desc: 'Schaltet den westlichen Waldrand (2×12 Felder) für mehr Beete & Pilz-Deko frei.',
    bounds: { x0: 0, y0: 2, x1: 1, y1: 13 },
    signPos: { gx: 1, gy: 7 },
    cost: 120,
    unlockLevel: 2
  },
  {
    id: 'south_meadow',
    name: 'Kürbis- & Winterwiese',
    desc: 'Schaltet die sonnige Südwiese (12×2 Felder) am Teich frei.',
    bounds: { x0: 2, y0: 14, x1: 13, y1: 15 },
    signPos: { gx: 7, gy: 14 },
    cost: 180,
    unlockLevel: 3
  },
  {
    id: 'east_glade',
    name: 'Eulen- & Zauberlichtung',
    desc: 'Schaltet die magische Ostlichtung (2×12 Felder) neben dem Schlitten frei.',
    bounds: { x0: 14, y0: 2, x1: 15, y1: 13 },
    signPos: { gx: 14, gy: 8 },
    cost: 250,
    unlockLevel: 4
  },
  {
    id: 'north_ridge',
    name: 'Nordlicht-Gipfel',
    desc: 'Schaltet den oberen Panorama-Streifen (16×2 Felder) hinter dem Chalet frei.',
    bounds: { x0: 0, y0: 0, x1: 15, y1: 1 },
    signPos: { gx: 7, gy: 1 },
    cost: 320,
    unlockLevel: 5
  }
];

export const ITEMS = {
  // ---- 8 Crops (Relaxed Hay-Day Pacing: 1 Min. – 10 Min.) ----
  wheat: {
    id: 'wheat',
    name: 'Goldweizen',
    category: 'crop',
    growTime: 60,
    seedCost: 3,
    sellPrice: 9,
    xp: 5,
    unlockLevel: 1,
    color: '#F5B82E',
    desc: 'Sonnengereifter Weizen – das Herz für Butterplätzchen, Waffeln & Hühnerfutter.'
  },
  mushroom: {
    id: 'mushroom',
    name: 'Herbst-Schwammerl',
    category: 'crop',
    growTime: 90,
    seedCost: 5,
    sellPrice: 16,
    xp: 8,
    unlockLevel: 1,
    color: '#D97706',
    desc: 'Aromatische Steinpilze & Pfifferlinge – wächst auf Beeten und wild im Wald!'
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Zucker-Kürbis',
    category: 'crop',
    growTime: 150,
    seedCost: 8,
    sellPrice: 24,
    xp: 11,
    unlockLevel: 1,
    color: '#F97316',
    desc: 'Süßer Herbstkürbis für knusprige Kürbis-Waffeln, Butterbier & Rentierfutter.'
  },
  matcha: {
    id: 'matcha',
    name: 'Matcha-Blätter',
    category: 'crop',
    growTime: 210,
    seedCost: 11,
    sellPrice: 34,
    xp: 15,
    unlockLevel: 1,
    color: '#4D9F3B',
    desc: 'Zarte smaragdgrüne Teeblätter für cremigen Matcha-Latte & Matcha-Tiramisu.'
  },
  berries: {
    id: 'berries',
    name: 'Winterbeeren',
    category: 'crop',
    growTime: 270,
    seedCost: 14,
    sellPrice: 42,
    xp: 18,
    unlockLevel: 2,
    color: '#D92B3A',
    desc: 'Rubinrote Beeren für Kräutertee, Stollen, Strickschals & Wollschafe.'
  },
  cocoa: {
    id: 'cocoa',
    name: 'Kakaobohnen',
    category: 'crop',
    growTime: 360,
    seedCost: 19,
    sellPrice: 56,
    xp: 24,
    unlockLevel: 3,
    color: '#7A4224',
    desc: 'Feine Kakaobohnen für Heiße Schokolade, Tiramisu & Zauber-Schokofrösche.'
  },
  cinnamon: {
    id: 'cinnamon',
    name: 'Zimt & Vanille',
    category: 'crop',
    growTime: 480,
    seedCost: 25,
    sellPrice: 74,
    xp: 30,
    unlockLevel: 4,
    color: '#B85D19',
    desc: 'Duftender Zimt & Sternanis für Christstollen und Kürbis-Zimt-Latte.'
  },
  candycane: {
    id: 'candycane',
    name: 'Zuckerstangen',
    category: 'crop',
    growTime: 600,
    seedCost: 32,
    sellPrice: 96,
    xp: 38,
    unlockLevel: 5,
    color: '#E63946',
    desc: 'Knusprige rot-weiße Zuckerstangen direkt aus dem winterlichen Zauberbeet.'
  },

  // ---- 4 Animal Products ----
  egg: {
    id: 'egg',
    name: 'Frische Eier',
    category: 'animal',
    sellPrice: 22,
    xp: 9,
    unlockLevel: 1,
    color: '#FFF2CC',
    desc: 'Landfrische Eier deiner kuscheligen Schneehühner.'
  },
  starmilk: {
    id: 'starmilk',
    name: 'Wintermilch',
    category: 'animal',
    sellPrice: 36,
    xp: 14,
    unlockLevel: 1,
    color: '#FEF3C7',
    desc: 'Samtig-cremige Milch deiner Glöckchen-Rentiere für Butter, Latte & Tiramisu.'
  },
  wool: {
    id: 'wool',
    name: 'Kuschelwolle',
    category: 'animal',
    sellPrice: 54,
    xp: 19,
    unlockLevel: 2,
    color: '#F1F5F9',
    desc: 'Wolkenweiche Wolle für gemütliche rot-goldene Zauberschals.'
  },
  magic_honey: {
    id: 'magic_honey',
    name: 'Eulen-Zauberhonig',
    category: 'animal',
    sellPrice: 68,
    xp: 25,
    unlockLevel: 3,
    color: '#F59E0B',
    desc: 'Goldschimmernder Zauberhonig, den deine Schnee-Eule aus dem Zauberwald bringt.'
  },

  // ---- Station 1: Backstube & Waffel-Ofen (4 Recipes) ----
  butterplaetzchen: {
    id: 'butterplaetzchen',
    name: 'Butterplätzchen',
    category: 'crafted',
    station: 'bakery',
    craftTime: 120,
    ingredients: { wheat: 2, egg: 1, starmilk: 1 },
    sellPrice: 95,
    xp: 26,
    unlockLevel: 1,
    color: '#F6C873',
    desc: 'Zarte, goldbraune Ausstech-Butterplätzchen – perfekt pur oder für Tiramisu!'
  },
  waffles: {
    id: 'waffles',
    name: 'Knusprige Waffeln',
    category: 'crafted',
    station: 'bakery',
    craftTime: 180,
    ingredients: { wheat: 2, egg: 1, pumpkin: 1 },
    sellPrice: 112,
    xp: 32,
    unlockLevel: 1,
    color: '#E59F49',
    desc: 'Goldene Herzwaffeln mit feiner Kürbis-Puderzucker-Note.'
  },
  lebkuchen: {
    id: 'lebkuchen',
    name: 'Lebkuchenmann',
    category: 'crafted',
    station: 'bakery',
    craftTime: 300,
    ingredients: { wheat: 2, cocoa: 1, egg: 1 },
    sellPrice: 145,
    xp: 42,
    unlockLevel: 3,
    color: '#A0522D',
    desc: 'Würziger Lebkuchenmann mit fröhlichem Zuckerguss-Lächeln.'
  },
  stollen: {
    id: 'stollen',
    name: 'Christstollen',
    category: 'crafted',
    station: 'bakery',
    craftTime: 480,
    ingredients: { wheat: 3, berries: 2, cinnamon: 1, starmilk: 1 },
    sellPrice: 275,
    xp: 68,
    unlockLevel: 4,
    color: '#F8F0E3',
    desc: 'Saftiger Festtagsstollen mit Winterbeeren und dicker Puderzuckerschicht.'
  },

  // ---- Station 2: Matcha- & Zauber-Teehaus (5 Recipes) ----
  matcha_latte: {
    id: 'matcha_latte',
    name: 'Matcha-Latte',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 150,
    ingredients: { matcha: 2, starmilk: 1 },
    sellPrice: 138,
    xp: 36,
    unlockLevel: 1,
    color: '#6BBF59',
    desc: 'Samtiger Bio-Matcha-Latte mit cremigem Milchschaumherz.'
  },
  herbal_tea: {
    id: 'herbal_tea',
    name: 'Herbst-Kräutertee',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 180,
    ingredients: { matcha: 1, berries: 2 },
    sellPrice: 152,
    xp: 40,
    unlockLevel: 2,
    color: '#C84B31',
    desc: 'Duftende Kanne warmer Beeren- und Kräutertee für verregnete Herbsttage.'
  },
  butterbeer: {
    id: 'butterbeer',
    name: 'Zauber-Butterbier',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 300,
    ingredients: { wheat: 2, pumpkin: 1, starmilk: 1 },
    sellPrice: 165,
    xp: 46,
    unlockLevel: 2,
    color: '#F59E0B',
    desc: 'Schäumender goldener Zaubertrank mit Karamell-Schaumkrone – wie in Hogsmeade!'
  },
  hot_cocoa: {
    id: 'hot_cocoa',
    name: 'Heiße Schokolade',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 240,
    ingredients: { cocoa: 2, starmilk: 1 },
    sellPrice: 185,
    xp: 48,
    unlockLevel: 3,
    color: '#6B3E26',
    desc: 'Cremige Winter-Schokolade mit Sahnehäubchen und kleinen Marshmallows.'
  },
  pumpkin_latte: {
    id: 'pumpkin_latte',
    name: 'Kürbis-Zimt-Latte',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 390,
    ingredients: { pumpkin: 2, cinnamon: 1, starmilk: 1 },
    sellPrice: 215,
    xp: 56,
    unlockLevel: 4,
    color: '#EA580C',
    desc: 'Herbstlicher Pumpkin Spice Latte mit Zimtstange und warmem Schaum.'
  },

  // ---- Station 3: Patisserie & Schwammerl-Küche (4 Recipes) ----
  mushroom_quiche: {
    id: 'mushroom_quiche',
    name: 'Schwammerl-Quiche',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 210,
    ingredients: { mushroom: 2, wheat: 2, egg: 1 },
    sellPrice: 142,
    xp: 38,
    unlockLevel: 2,
    color: '#C68B3C',
    desc: 'Ofenwarme Waldpilz-Quiche mit frischen Herbst-Schwammerln und Kräutern.'
  },
  chocofrog: {
    id: 'chocofrog',
    name: 'Zauber-Schokofrosch',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 270,
    ingredients: { cocoa: 2, magic_honey: 1 },
    sellPrice: 225,
    xp: 58,
    unlockLevel: 3,
    color: '#5C2C16',
    desc: 'Magischer Schokoladenfrosch mit goldener Sammel-Zauberkarte!'
  },
  tiramisu: {
    id: 'tiramisu',
    name: 'Klassisches Tiramisu',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 360,
    ingredients: { butterplaetzchen: 1, cocoa: 1, egg: 1, starmilk: 1 },
    sellPrice: 265,
    xp: 66,
    unlockLevel: 3,
    color: '#8D5524',
    desc: 'Luftige Mascarpone-Creme auf hausgemachten Butterplätzchen, fein bestäubt mit Kakao.'
  },
  matcha_tiramisu: {
    id: 'matcha_tiramisu',
    name: 'Matcha-Tiramisu',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 420,
    ingredients: { butterplaetzchen: 1, matcha: 2, starmilk: 1, egg: 1 },
    sellPrice: 295,
    xp: 76,
    unlockLevel: 3,
    color: '#4F9D45',
    desc: 'Das absolute Lieblings-Dessert: zartes Tiramisu gekrönt mit edlem grünem Matcha!'
  },

  // ---- Station 4: Wichtel- & Zauberwerkstatt (3 Recipes) ----
  wool_scarf: {
    id: 'wool_scarf',
    name: 'Zauber-Strickschal',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 360,
    ingredients: { wool: 2, berries: 1 },
    sellPrice: 195,
    xp: 52,
    unlockLevel: 4,
    color: '#B91C1C',
    desc: 'Kuscheliger rot-gold gestreifter Schal im klassischen Zauberschul-Stil.'
  },
  cookie_tin: {
    id: 'cookie_tin',
    name: 'Plätzchen- & Waffeldose',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 540,
    ingredients: { butterplaetzchen: 1, waffles: 1, candycane: 1 },
    sellPrice: 385,
    xp: 92,
    unlockLevel: 5,
    color: '#1D6F42',
    desc: 'Liebevoll gefüllte Festtagsdose mit frischen Butterplätzchen & Waffeln.'
  },
  mega_gift: {
    id: 'mega_gift',
    name: 'Zauber-Geschenkkorb',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 720,
    ingredients: { matcha_tiramisu: 1, butterbeer: 1, wool_scarf: 1 },
    sellPrice: 780,
    xp: 160,
    unlockLevel: 5,
    color: '#E63946',
    desc: 'Der ultimative Festtagskorb: Matcha-Tiramisu, Butterbier & Zauberschal!'
  }
};

export const CROP_IDS = ['wheat', 'mushroom', 'pumpkin', 'matcha', 'berries', 'cocoa', 'cinnamon', 'candycane'];

export const ANIMALS = {
  chicken: {
    id: 'chicken',
    name: 'Schneehuhn',
    defaultNick: 'Flöckchen',
    sprite: 'animal_chicken',
    feedItem: 'wheat',
    feedQty: 1,
    produceItem: 'egg',
    produceTime: 120,
    cost: 55,
    unlockLevel: 1,
    maxCount: 4,
    soundPitch: 1.25,
    desc: 'Kuscheliges Huhn mit rotem Schal – frisst Goldweizen und legt frische Eier (2 Min.).'
  },
  reindeer: {
    id: 'reindeer',
    name: 'Glöckchen-Rentier',
    defaultNick: 'Rudi',
    sprite: 'animal_reindeer',
    feedItem: 'pumpkin',
    feedQty: 1,
    produceItem: 'starmilk',
    produceTime: 240,
    cost: 125,
    unlockLevel: 1,
    maxCount: 3,
    soundPitch: 1.05,
    desc: 'Niedliches Rentier mit Glöckchen – liebt Kürbis und gibt cremige Wintermilch (4 Min.).'
  },
  sheep: {
    id: 'sheep',
    name: 'Wollschaf',
    defaultNick: 'Wölkchen',
    sprite: 'animal_sheep',
    feedItem: 'berries',
    feedQty: 1,
    produceItem: 'wool',
    produceTime: 300,
    cost: 160,
    unlockLevel: 2,
    maxCount: 3,
    soundPitch: 0.9,
    desc: 'Flauschiges Schaf mit Weihnachtsmütze – schenkt dir Kuschelwolle (5 Min.).'
  },
  owl: {
    id: 'owl',
    name: 'Schnee-Eule',
    defaultNick: 'Hedwig',
    sprite: 'animal_owl',
    feedItem: 'mushroom',
    feedQty: 1,
    produceItem: 'magic_honey',
    produceTime: 360,
    cost: 210,
    unlockLevel: 3,
    maxCount: 2,
    soundPitch: 1.38,
    desc: 'Magische weiße Hof-Eule – fliegt nach Schwammerln aus und bringt Zauberhonig (6 Min.)!'
  }
};

export const STATIONS = {
  bakery: {
    id: 'bakery',
    name: 'Backstube & Waffel-Ofen',
    sprite: 'christmas_bakery',
    footprint: 2,
    unlockLevel: 1,
    cost: 0,
    recipes: ['butterplaetzchen', 'waffles', 'lebkuchen', 'stollen'],
    chimneyOffset: { x: 0.2, y: -0.78 },
    glowPoints: [{ x: -0.14, y: -0.34, r: 0.28 }],
    desc: 'Duftende Backstube für Butterplätzchen, knusprige Waffeln, Lebkuchen & Stollen.'
  },
  teahouse: {
    id: 'teahouse',
    name: 'Matcha- & Zauber-Teehaus',
    sprite: 'punch_stand',
    footprint: 2,
    unlockLevel: 1,
    cost: 90,
    recipes: ['matcha_latte', 'herbal_tea', 'butterbeer', 'hot_cocoa', 'pumpkin_latte'],
    chimneyOffset: { x: -0.18, y: -0.45 },
    glowPoints: [{ x: 0.0, y: -0.52, r: 0.42 }],
    desc: 'Gemütliches Teehaus für Matcha-Latte, Kräutertee, Zauber-Butterbier & Kakao.'
  },
  patisserie: {
    id: 'patisserie',
    name: 'Tiramisu- & Schwammerl-Küche',
    sprite: 'patisserie_house',
    footprint: 2,
    unlockLevel: 2,
    cost: 160,
    recipes: ['mushroom_quiche', 'chocofrog', 'tiramisu', 'matcha_tiramisu'],
    chimneyOffset: { x: 0.16, y: -0.76 },
    glowPoints: [{ x: 0.0, y: -0.32, r: 0.36 }],
    desc: 'Feine Hof-Patisserie für Schwammerl-Quiche, Tiramisu, Matcha-Tiramisu & Schokofrösche!'
  },
  gift_workshop: {
    id: 'gift_workshop',
    name: 'Wichtel- & Zauberwerkstatt',
    sprite: 'gift_workshop',
    footprint: 2,
    unlockLevel: 4,
    cost: 240,
    recipes: ['wool_scarf', 'cookie_tin', 'mega_gift'],
    chimneyOffset: { x: 0.24, y: -0.74 },
    glowPoints: [{ x: 0.14, y: -0.22, r: 0.32 }, { x: -0.16, y: -0.42, r: 0.24 }],
    desc: 'Werkstatt für Zauber-Strickschals, Plätzchendosen & magische Festtagskörbe.'
  }
};

export const DECORATIONS = {
  // --- Herbst & Halloween ---
  pumpkin_lantern: {
    id: 'pumpkin_lantern',
    name: 'Halloween-Kürbis',
    theme: 'Herbst',
    sprite: 'deco_pumpkin',
    cost: 30,
    xp: 12,
    unlockLevel: 1,
    glow: true,
    glowOffset: { x: 0, y: -0.22, r: 0.45 },
    desc: 'Fröhlich geschnitzter Herbstkürbis mit flackerndem Kerzenlicht.'
  },
  ghost: {
    id: 'ghost',
    name: 'Kuschel-Geist',
    theme: 'Halloween',
    sprite: 'deco_ghost',
    cost: 45,
    xp: 16,
    unlockLevel: 1,
    glow: true,
    glowOffset: { x: 0, y: -0.4, r: 0.36 },
    floatAnim: true,
    desc: 'Ein niedliches kleines Halloween-Geisterchen mit Minikürbis – schwebt sanft!'
  },
  spider: {
    id: 'spider',
    name: 'Glücksspinne im Netz',
    theme: 'Halloween',
    sprite: 'deco_spider',
    cost: 40,
    xp: 14,
    unlockLevel: 1,
    glow: false,
    desc: 'Süße kleine Herbstspinne mit großen Kulleraugen an einem glitzernden Netz.'
  },
  mushrooms: {
    id: 'mushrooms',
    name: 'Schwammerl-Kreis',
    theme: 'Herbst',
    sprite: 'deco_mushrooms',
    cost: 35,
    xp: 14,
    unlockLevel: 1,
    glow: false,
    desc: 'Verträumte Gruppe aus Steinpilzen und roten Glücks-Fliegenpilzen.'
  },
  autumn_tree: {
    id: 'autumn_tree',
    name: 'Goldener Herbstahorn',
    theme: 'Herbst',
    sprite: 'deco_autumn_tree',
    cost: 50,
    xp: 18,
    unlockLevel: 1,
    glow: false,
    desc: 'Leuchtend orange-roter Herbstbaum mit sanft raschelnden Blättern.'
  },
  // --- Harry Potter Magie ---
  sorting_hat: {
    id: 'sorting_hat',
    name: 'Sprechender Zauberhut',
    theme: 'Magie',
    sprite: 'deco_sorting_hat',
    cost: 75,
    xp: 26,
    unlockLevel: 1,
    glow: false,
    desc: 'Der legendäre Flicken-Zauberhut auf einem Holzhocker – flüstert beim Antippen!'
  },
  floating_candles: {
    id: 'floating_candles',
    name: 'Schwebende Kerzen',
    theme: 'Magie',
    sprite: 'deco_floating_candles',
    cost: 65,
    xp: 24,
    unlockLevel: 2,
    glow: true,
    glowOffset: { x: 0, y: -0.58, r: 0.62 },
    floatAnim: true,
    desc: 'Magische schwebende Wachskerzen wie in der Großen Halle – leuchten abends herrlich!'
  },
  broom: {
    id: 'broom',
    name: 'Fliegender Zauberbesen',
    theme: 'Magie',
    sprite: 'deco_broom',
    cost: 80,
    xp: 28,
    unlockLevel: 2,
    glow: false,
    desc: 'Handgeschnitzter Rennbesen mit goldenen Beschlägen, bereit für den nächsten Flug.'
  },
  cauldron: {
    id: 'cauldron',
    name: 'Zaubertrank-Kessel',
    theme: 'Magie',
    sprite: 'deco_cauldron',
    cost: 95,
    xp: 32,
    unlockLevel: 3,
    glow: true,
    glowOffset: { x: 0, y: -0.35, r: 0.48 },
    desc: 'Blubbernder Zauberkessel mit schimmerndem smaragdgrünem Matcha-Zauberdampf.'
  },
  // --- Winter & Weihnachten ---
  snowman: {
    id: 'snowman',
    name: 'Schneemann',
    theme: 'Winter',
    sprite: 'deco_snowman',
    cost: 35,
    xp: 12,
    unlockLevel: 1,
    glow: false,
    desc: 'Ein fröhlicher Schneemann mit Karottennase und gestreiftem Schal.'
  },
  lantern: {
    id: 'lantern',
    name: 'Dorf-Laterne',
    theme: 'Winter',
    sprite: 'deco_lantern',
    cost: 45,
    xp: 15,
    unlockLevel: 1,
    glow: true,
    glowOffset: { x: 0, y: -0.62, r: 0.58 },
    desc: 'Zaubert am Abend warmes goldenes Licht auf deine Wege.'
  },
  pine: {
    id: 'pine',
    name: 'Schneetanne',
    theme: 'Winter',
    sprite: 'deco_pine',
    cost: 30,
    xp: 10,
    unlockLevel: 1,
    glow: false,
    desc: 'Kuschelig eingeschneite Tanne für echtes Winterwald-Flair.'
  },
  giftpile: {
    id: 'giftpile',
    name: 'Geschenkehaufen',
    theme: 'Winter',
    sprite: 'deco_giftpile',
    cost: 60,
    xp: 22,
    unlockLevel: 2,
    glow: false,
    desc: 'Bunte Päckchen mit glänzenden Schleifen als festliche Deko.'
  },
  bench: {
    id: 'bench',
    name: 'Kuschelbank',
    theme: 'Winter',
    sprite: 'deco_bench',
    cost: 70,
    xp: 24,
    unlockLevel: 2,
    glow: true,
    glowOffset: { x: 0.2, y: -0.35, r: 0.35 },
    desc: 'Holzbank mit rot karierter Decke und kleiner Laterne.'
  },
  lightarch: {
    id: 'lightarch',
    name: 'Lichterbogen',
    theme: 'Winter',
    sprite: 'deco_lightarch',
    cost: 120,
    xp: 38,
    unlockLevel: 3,
    glow: true,
    glowOffset: { x: 0, y: -0.65, r: 0.72 },
    desc: 'Festlicher Tannenbogen mit funkelnder goldener Lichterkette.'
  }
};

export const ACHIEVEMENTS = [
  { id: 'ach_harvest', title: 'Ernte-Freude', desc: 'Ernte 12× Felder auf deinem Hof', stat: 'harvests', goal: 12, coins: 45, xp: 20, icon: '🌾' },
  { id: 'ach_mushrooms', title: 'Schwammerl-Profi', desc: 'Sammle 4× wilde Wald-Schwammerl ein', stat: 'wildMushrooms', goal: 4, coins: 60, xp: 28, icon: '🍄' },
  { id: 'ach_bake', title: 'Plätzchen- & Waffelbäcker', desc: 'Stelle 5× Leckereien her', stat: 'crafted', goal: 5, coins: 75, xp: 35, icon: '🧇' },
  { id: 'ach_matcha', title: 'Matcha-Liebhaber', desc: 'Bereite 3× Matcha-Latte oder Matcha-Tiramisu zu', stat: 'matchaMade', goal: 3, coins: 90, xp: 45, icon: '🍵' },
  { id: 'ach_pet', title: 'Tierflüsterer', desc: 'Streichle deine Tiere 5×', stat: 'pets', goal: 5, coins: 50, xp: 25, icon: '❤️' },
  { id: 'ach_snitch', title: 'Sucher-Talent!', desc: 'Fange 2× den Goldenen Schnatz über dem Dorf', stat: 'snitches', goal: 2, coins: 110, xp: 55, icon: '✨' },
  { id: 'ach_orders', title: 'Fleißiger Schlitten', desc: 'Erfülle 4× Dorf-Wunschzettel', stat: 'ordersDone', goal: 4, coins: 100, xp: 50, icon: '🛷' },
  { id: 'ach_stand', title: 'Hofladen-Star', desc: 'Verkaufe 3× Kisten am eigenen Hofladen', stat: 'standSales', goal: 3, coins: 80, xp: 40, icon: '🏪' },
  { id: 'ach_season', title: 'Jahreszeiten-Zauber', desc: 'Wechsle zwischen Herbst und Winter', stat: 'seasonSwitches', goal: 1, coins: 40, xp: 20, icon: '🍂' },
  { id: 'ach_land', title: 'Hof-Erweiterung', desc: 'Schalte 1× neues Grundstück frei', stat: 'landsUnlocked', goal: 1, coins: 120, xp: 60, icon: '🗺️' }
];

export const LEVELS = [
  { level: 1,  xpNeeded: 0,    coinBonus: 0,   treeStage: 1, unlockText: 'Willkommen auf deinem Herbst-, Winter- & Zauberhof!' },
  { level: 2,  xpNeeded: 95,   coinBonus: 75,  treeStage: 1, unlockText: 'Freigeschaltet: Tiramisu-Küche, Wollschaf, Winterbeeren, Kräutertee & Zauber-Butterbier!' },
  { level: 3,  xpNeeded: 240,  coinBonus: 120, treeStage: 2, unlockText: 'Freigeschaltet: Schnee-Eule 🦉, Kakao, Tiramisu, Matcha-Tiramisu & Schokofrosch!' },
  { level: 4,  xpNeeded: 450,  coinBonus: 170, treeStage: 2, unlockText: 'Freigeschaltet: Zauberwerkstatt, Zimt & Vanille, Stollen, Kürbis-Latte & Strickschal!' },
  { level: 5,  xpNeeded: 730,  coinBonus: 230, treeStage: 3, unlockText: 'Freigeschaltet: Zuckerstangen, Plätzchendose & Zauber-Geschenkkorb! Dein Dorfbaum erstrahlt voll!' },
  { level: 6,  xpNeeded: 1080, coinBonus: 300, treeStage: 3, unlockText: 'Meister der Backstube & Zauberküche!' },
  { level: 7,  xpNeeded: 1520, coinBonus: 380, treeStage: 3, unlockText: 'Goldener Matcha- & Herbstzauber-Ehrengast!' },
  { level: 8,  xpNeeded: 2050, coinBonus: 480, treeStage: 3, unlockText: 'Hüter des magischen Herbst- & Wintertals!' },
  { level: 9,  xpNeeded: 2700, coinBonus: 600, treeStage: 3, unlockText: 'Legende zwischen Hogsmeade und Nordpol!' },
  { level: 10, xpNeeded: 3500, coinBonus: 800, treeStage: 3, unlockText: 'Höchste Gemütlichkeit auf dem Zauberhof!' }
];

export const NPCS = [
  {
    id: 'hilde',
    name: 'Oma Hilde',
    avatarBg: '#E63946',
    emoji: '👵',
    quotes: [
      'Für unseren gemütlichen Nachmittag fehlt noch ein Stück Tiramisu oder Butterplätzchen!',
      'Deine knusprigen Waffeln duften bis ins ganze Tal!',
      'Nichts wärmt das Herz so sehr wie eine Tasse Tee von deinem Hof.'
    ]
  },
  {
    id: 'rubeus',
    name: 'Wildhüter Rudi',
    avatarBg: '#7C3F1A',
    emoji: '🧔',
    quotes: [
      'Hoho, die Wald-Schwammerl stehen heute prächtig! Hast du mir ein Butterbier?',
      'Meine kleine Hütte am Waldrand riecht schon nach deinen Kürbissen!',
      'Bring den Eulen und Rentieren einen lieben Gruß von mir mit!'
    ]
  },
  {
    id: 'leo',
    name: 'Zauberlehrling Leo',
    avatarBg: '#7F1D1D',
    emoji: '🧙',
    quotes: [
      'Vor der Zaubertrank-Stunde brauche ich dringend einen Matcha-Latte!',
      'Schokofrösche und Zauber-Butterbier sind in der Großen Halle der Hit!',
      'Hast du heute schon den Goldenen Schnatz über dem Dorf gesehen?'
    ]
  },
  {
    id: 'luna',
    name: 'Schneefee Luna',
    avatarBg: '#457B9D',
    emoji: '❄️',
    quotes: [
      'Im Herbst wie im Winter – dein Hof hat den schönsten Zauber im ganzen Tal.',
      'Ein Matcha-Tiramisu unterm Sternenhimmel wäre heute einfach perfekt!',
      'Die schwebenden Kerzen und Laternen leuchten heute besonders warm.'
    ]
  },
  {
    id: 'fips',
    name: 'Wichtel Fips',
    avatarBg: '#2A9D8F',
    emoji: '🧝',
    quotes: [
      'Ho-ho, in der Werkstatt brauchen wir Nachschub an Plätzchen & Waffeln!',
      'Der Schlitten ist geputzt – belade ihn mit deinen Köstlichkeiten!',
      'Deine Schwammerl-Quiche hat alle Wichtel umgehauen!'
    ]
  },
  {
    id: 'nikolaus',
    name: 'Nikolaus',
    avatarBg: '#B91C1C',
    emoji: '🎅',
    quotes: [
      'Ho Ho Ho! Matcha, Waffeln und Butterplätzchen – genau mein Geschmack!',
      'Die Rentiere schnuppern schon nach Kürbis und Zimt!',
      'Dein Herbst- & Winterhof ist ein echtes Meisterwerk!'
    ]
  }
];

export const SORTING_HAT_QUOTES = [
  '„Hmm… viel Herz, eine Schwäche für Matcha und perfekte Waffeln… eindeutig ZAUBERHOF!“',
  '„Ich sehe Herbstlaub, fliegende Eulen und himmlisches Tiramisu in deiner Zukunft!“',
  '„Mutig beim Backen, gemütlich im Herzen – 50 Punkte für deinen Hof!“',
  '„Schwammerl im Korb, Butterbier im Krug – wahrhaft magisch!“'
];

export const CHAPTERS = [
  {
    id: 'ch_1',
    num: 1,
    title: 'Kapitel 1: Duft von Butterplätzchen',
    goalText: 'Ernte 4 Felder & backe 1× Butterplätzchen oder Waffeln',
    check: (s) => (s.stats.harvests || 0) >= 4 && (s.stats.crafted || 0) >= 1,
    coins: 55,
    xp: 35
  },
  {
    id: 'ch_2',
    num: 2,
    title: 'Kapitel 2: Das Matcha- & Zauber-Teehaus',
    goalText: 'Baue das Matcha-Teehaus & packe die rote Schleife aus',
    check: (s) => s.stations.some((st) => st.type === 'teahouse' && st.built && !st.wrapped),
    coins: 85,
    xp: 55
  },
  {
    id: 'ch_3',
    num: 3,
    title: 'Kapitel 3: Herbst, Magie & Schwammerl',
    goalText: 'Sammle 2 Wald-Schwammerl & wechsle einmal die Jahreszeit (🍂/❄️)',
    check: (s) => (s.stats.wildMushrooms || 0) >= 2 && (s.stats.seasonSwitches || 0) >= 1,
    coins: 110,
    xp: 75
  },
  {
    id: 'ch_4',
    num: 4,
    title: 'Kapitel 4: Tiramisu- & Schlitten-Meister',
    goalText: 'Erfülle 3 Dorf-Wunschzettel & verkaufe 1× am Hofladen',
    check: (s) => (s.stats.ordersDone || 0) >= 3 && (s.stats.standSales || 0) >= 1,
    coins: 165,
    xp: 110
  }
];

export function getStationMastery(craftedCount = 0) {
  if (craftedCount >= 18) return { stars: 3, speedMult: 0.8, nextAt: null, label: 'Meister ★★★ (-20 % Zeit)' };
  if (craftedCount >= 9) return { stars: 2, speedMult: 0.88, nextAt: 18, label: 'Profi ★★☆ (-12 % Zeit)' };
  if (craftedCount >= 3) return { stars: 1, speedMult: 0.94, nextAt: 9, label: 'Geselle ★☆☆ (-6 % Zeit)' };
  return { stars: 0, speedMult: 1.0, nextAt: 3, label: 'Anfänger ☆☆☆' };
}

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpNeeded) current = lvl;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1) || null;
  const progress = next
    ? Math.min(1, (xp - current.xpNeeded) / (next.xpNeeded - current.xpNeeded))
    : 1;
  return { ...current, next, progress };
}
