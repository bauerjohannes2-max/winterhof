// ============================================================================
// WINTERHOF — Pure Alpine Christmas Farm Game Data (AAA Cohesive Edition)
// Strict Zero-Emoji Policy · Balanced Step-by-Step Progression
// ============================================================================

export const GRID_SIZE = 14;

// 4 Expandable Alpine Snow Zones outside the starter farmstead (2..11 x 2..11)
// All zones stay strictly inside the natural riverbanks (brook at gx=14, pond at gy=14)
export const LAND_ZONES = [
  {
    id: 'west_forest',
    name: 'Tannenwäldchen',
    desc: 'Erweitert den westlichen Waldrand (2×10 Felder) für zusätzliche Beete & Deko.',
    bounds: { x0: 0, y0: 2, x1: 1, y1: 11 },
    signPos: { gx: 1, gy: 9 },
    cost: 120,
    unlockLevel: 2
  },
  {
    id: 'south_meadow',
    name: 'Teichwiese',
    desc: 'Öffnet die sonnige Südwiese (10×2 Felder) oberhalb des gefrorenen Alpenteichs.',
    bounds: { x0: 2, y0: 12, x1: 11, y1: 13 },
    signPos: { gx: 5, gy: 12 },
    cost: 180,
    unlockLevel: 3
  },
  {
    id: 'east_glade',
    name: 'Schlittenlichtung',
    desc: 'Schaltet die östliche Lichtung (2×10 Felder) direkt am Gebirgsbach frei.',
    bounds: { x0: 12, y0: 2, x1: 13, y1: 11 },
    signPos: { gx: 12, gy: 9 },
    cost: 250,
    unlockLevel: 4
  },
  {
    id: 'north_ridge',
    name: 'Nordlicht-Gipfel',
    desc: 'Erschließt das obere Panorama (12×2 Felder) hinter dem Chalet.',
    bounds: { x0: 0, y0: 0, x1: 11, y1: 1 },
    signPos: { gx: 11, gy: 1 },
    cost: 320,
    unlockLevel: 5
  }
];

export const ITEMS = {
  // ---- 6 Winter Crops (Cozy Hay-Day Pacing: 1 Min. – 10 Min.) ----
  wheat: {
    id: 'wheat',
    name: 'Goldweizen',
    category: 'crop',
    growTime: 60,
    seedCost: 3,
    sellPrice: 10,
    xp: 5,
    unlockLevel: 1,
    color: '#F5B82E',
    desc: 'Goldener Winterweizen – Grundlage für Butterplätzchen, Waffeln und Hühnerfutter.'
  },
  berries: {
    id: 'berries',
    name: 'Winterbeeren',
    category: 'crop',
    growTime: 120,
    seedCost: 6,
    sellPrice: 20,
    xp: 9,
    unlockLevel: 1,
    color: '#D92B3A',
    desc: 'Rubinrote Beeren für Winterpunsch, Rentierfutter und festliche Torten.'
  },
  matcha: {
    id: 'matcha',
    name: 'Winter-Matcha',
    category: 'crop',
    growTime: 210,
    seedCost: 11,
    sellPrice: 34,
    xp: 15,
    unlockLevel: 2,
    color: '#4D9F3B',
    desc: 'Feine grüne Teeblätter aus dem Gewächsbeet für Matcha-Latte und Matcha-Tiramisu.'
  },
  cocoa: {
    id: 'cocoa',
    name: 'Kakaobohnen',
    category: 'crop',
    growTime: 300,
    seedCost: 16,
    sellPrice: 48,
    xp: 21,
    unlockLevel: 2,
    color: '#7A4224',
    desc: 'Aromatische Kakaobohnen für Heiße Schokolade, Lebkuchen und Tiramisu.'
  },
  cinnamon: {
    id: 'cinnamon',
    name: 'Zimt & Vanille',
    category: 'crop',
    growTime: 450,
    seedCost: 24,
    sellPrice: 72,
    xp: 29,
    unlockLevel: 3,
    color: '#B85D19',
    desc: 'Duftende Zimtstangen und Vanilleschoten für Christstollen und Wintertee.'
  },
  candycane: {
    id: 'candycane',
    name: 'Zuckerstangen',
    category: 'crop',
    growTime: 600,
    seedCost: 32,
    sellPrice: 96,
    xp: 38,
    unlockLevel: 4,
    color: '#E63946',
    desc: 'Knusprige rot-weiße Zuckerstangen aus dem festlichen Winterbeet.'
  },

  // ---- 3 Alpine Animal Products ----
  egg: {
    id: 'egg',
    name: 'Frische Eier',
    category: 'animal',
    sellPrice: 22,
    xp: 9,
    unlockLevel: 1,
    color: '#FFF2CC',
    desc: 'Landfrische Eier deiner Schneehühner.'
  },
  starmilk: {
    id: 'starmilk',
    name: 'Wintermilch',
    category: 'animal',
    sellPrice: 36,
    xp: 14,
    unlockLevel: 1,
    color: '#FEF3C7',
    desc: 'Cremige Milch deiner Glöckchen-Rentiere für Kakao, Latte und Tiramisu.'
  },
  wool: {
    id: 'wool',
    name: 'Kuschelwolle',
    category: 'animal',
    sellPrice: 54,
    xp: 19,
    unlockLevel: 2,
    color: '#F1F5F9',
    desc: 'Weiche Schafwolle für warme Winter-Strickschals.'
  },

  // ---- Station 1: Backstube (4 Recipes) ----
  butterplaetzchen: {
    id: 'butterplaetzchen',
    name: 'Butterplätzchen',
    category: 'crafted',
    station: 'bakery',
    craftTime: 120,
    ingredients: { wheat: 2, egg: 1 },
    sellPrice: 72,
    xp: 22,
    unlockLevel: 1,
    color: '#F6C873',
    desc: 'Zarte, goldbraune Ausstech-Plätzchen direkt aus dem Steinofen.'
  },
  waffles: {
    id: 'waffles',
    name: 'Knusprige Waffeln',
    category: 'crafted',
    station: 'bakery',
    craftTime: 180,
    ingredients: { wheat: 2, egg: 1, berries: 1 },
    sellPrice: 105,
    xp: 30,
    unlockLevel: 1,
    color: '#E59F49',
    desc: 'Goldene Herzwaffeln mit Puderzucker und warmen Winterbeeren.'
  },
  lebkuchen: {
    id: 'lebkuchen',
    name: 'Lebkuchenmann',
    category: 'crafted',
    station: 'bakery',
    craftTime: 270,
    ingredients: { wheat: 2, cocoa: 1, egg: 1 },
    sellPrice: 148,
    xp: 42,
    unlockLevel: 2,
    color: '#A0522D',
    desc: 'Würziger Lebkuchen mit feinem Zuckerguss.'
  },
  stollen: {
    id: 'stollen',
    name: 'Christstollen',
    category: 'crafted',
    station: 'bakery',
    craftTime: 480,
    ingredients: { wheat: 3, berries: 2, cinnamon: 1, starmilk: 1 },
    sellPrice: 285,
    xp: 72,
    unlockLevel: 3,
    color: '#F8F0E3',
    desc: 'Saftiger Festtagsstollen mit Winterbeeren, Zimt und Puderzucker.'
  },

  // ---- Station 2: Punsch- & Café-Stand (4 Recipes) ----
  winter_punch: {
    id: 'winter_punch',
    name: 'Winterpunsch',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 150,
    ingredients: { berries: 2, wheat: 1 },
    sellPrice: 96,
    xp: 28,
    unlockLevel: 1,
    color: '#B91C1C',
    desc: 'Wärmender Beerenpunsch aus dem Kupferkessel.'
  },
  matcha_latte: {
    id: 'matcha_latte',
    name: 'Matcha-Latte',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 180,
    ingredients: { matcha: 2, starmilk: 1 },
    sellPrice: 142,
    xp: 38,
    unlockLevel: 2,
    color: '#6BBF59',
    desc: 'Samtiger Matcha-Latte mit cremigem Milchschaum.'
  },
  hot_cocoa: {
    id: 'hot_cocoa',
    name: 'Heiße Schokolade',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 240,
    ingredients: { cocoa: 2, starmilk: 1 },
    sellPrice: 182,
    xp: 48,
    unlockLevel: 2,
    color: '#6B3E26',
    desc: 'Cremige Winter-Schokolade mit Sahnehäubchen.'
  },
  cinnamon_tea: {
    id: 'cinnamon_tea',
    name: 'Zimt-Beeren-Tee',
    category: 'crafted',
    station: 'teahouse',
    craftTime: 330,
    ingredients: { berries: 2, cinnamon: 1, matcha: 1 },
    sellPrice: 215,
    xp: 56,
    unlockLevel: 3,
    color: '#C84B31',
    desc: 'Duftende Winterkanne mit Zimtstange und Beeren.'
  },

  // ---- Station 3: Hof-Patisserie (3 Recipes) ----
  berry_tart: {
    id: 'berry_tart',
    name: 'Winterbeer-Torte',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 240,
    ingredients: { butterplaetzchen: 1, berries: 2, starmilk: 1 },
    sellPrice: 210,
    xp: 54,
    unlockLevel: 2,
    color: '#C2410C',
    desc: 'Feine Sahnetorte auf Mürbeteig mit glasierten Winterbeeren.'
  },
  tiramisu: {
    id: 'tiramisu',
    name: 'Klassisches Tiramisu',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 360,
    ingredients: { butterplaetzchen: 1, cocoa: 1, egg: 1, starmilk: 1 },
    sellPrice: 265,
    xp: 68,
    unlockLevel: 3,
    color: '#8D5524',
    desc: 'Luftige Mascarpone-Creme auf Butterplätzchen, fein bestäubt mit Kakao.'
  },
  matcha_tiramisu: {
    id: 'matcha_tiramisu',
    name: 'Matcha-Tiramisu',
    category: 'crafted',
    station: 'patisserie',
    craftTime: 420,
    ingredients: { butterplaetzchen: 1, matcha: 2, starmilk: 1, egg: 1 },
    sellPrice: 298,
    xp: 78,
    unlockLevel: 3,
    color: '#4F9D45',
    desc: 'Zartes Winter-Tiramisu gekrönt mit feinem grünen Matcha.'
  },

  // ---- Station 4: Geschenkewerkstatt (3 Recipes) ----
  wool_scarf: {
    id: 'wool_scarf',
    name: 'Winter-Strickschal',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 360,
    ingredients: { wool: 2, berries: 1 },
    sellPrice: 195,
    xp: 52,
    unlockLevel: 3,
    color: '#B91C1C',
    desc: 'Handgestrickter rot-goldener Wollschal für kalte Tage.'
  },
  cookie_tin: {
    id: 'cookie_tin',
    name: 'Plätzchendose',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 510,
    ingredients: { butterplaetzchen: 1, waffles: 1, candycane: 1 },
    sellPrice: 365,
    xp: 88,
    unlockLevel: 4,
    color: '#1D6F42',
    desc: 'Festliche Blechdose gefüllt mit Plätzchen, Waffeln und Zuckerstangen.'
  },
  mega_gift: {
    id: 'mega_gift',
    name: 'Festtagskorb',
    category: 'crafted',
    station: 'gift_workshop',
    craftTime: 690,
    ingredients: { matcha_tiramisu: 1, winter_punch: 1, wool_scarf: 1 },
    sellPrice: 740,
    xp: 155,
    unlockLevel: 5,
    color: '#E63946',
    desc: 'Prachtvoller Weihnachtskorb mit Tiramisu, Punsch und Strickschal.'
  }
};

export const CROP_IDS = ['wheat', 'berries', 'matcha', 'cocoa', 'cinnamon', 'candycane'];

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
    desc: 'Frisst Goldweizen und legt landfrische Eier (2 Min.).'
  },
  reindeer: {
    id: 'reindeer',
    name: 'Glöckchen-Rentier',
    defaultNick: 'Rudi',
    sprite: 'animal_reindeer',
    feedItem: 'berries',
    feedQty: 1,
    produceItem: 'starmilk',
    produceTime: 240,
    cost: 125,
    unlockLevel: 1,
    maxCount: 3,
    soundPitch: 1.05,
    desc: 'Liebt Winterbeeren und schenkt cremige Wintermilch (4 Min.).'
  },
  sheep: {
    id: 'sheep',
    name: 'Wollschaf',
    defaultNick: 'Wölkchen',
    sprite: 'animal_sheep',
    feedItem: 'wheat',
    feedQty: 2,
    produceItem: 'wool',
    produceTime: 300,
    cost: 165,
    unlockLevel: 2,
    maxCount: 3,
    soundPitch: 0.9,
    desc: 'Schenkt weiche Kuschelwolle für die Geschenkewerkstatt (5 Min.).'
  }
};

export const STATIONS = {
  bakery: {
    id: 'bakery',
    name: 'Backstube',
    sprite: 'christmas_bakery',
    footprint: 2,
    unlockLevel: 1,
    cost: 0,
    recipes: ['butterplaetzchen', 'waffles', 'lebkuchen', 'stollen'],
    chimneyOffset: { x: 0.2, y: -0.78 },
    glowPoints: [{ x: -0.14, y: -0.34, r: 0.28 }],
    desc: 'Duftender Steinofen für Butterplätzchen, Waffeln, Lebkuchen und Christstollen.'
  },
  teahouse: {
    id: 'teahouse',
    name: 'Punsch- & Café-Stand',
    sprite: 'punch_stand',
    footprint: 2,
    unlockLevel: 1,
    cost: 90,
    recipes: ['winter_punch', 'matcha_latte', 'hot_cocoa', 'cinnamon_tea'],
    chimneyOffset: { x: -0.18, y: -0.45 },
    glowPoints: [{ x: 0.0, y: -0.52, r: 0.42 }],
    desc: 'Heißer Winterpunsch, Matcha-Latte, Schokolade und Zimt-Beeren-Tee.'
  },
  patisserie: {
    id: 'patisserie',
    name: 'Hof-Patisserie',
    sprite: 'patisserie_house',
    footprint: 2,
    unlockLevel: 2,
    cost: 165,
    recipes: ['berry_tart', 'tiramisu', 'matcha_tiramisu'],
    chimneyOffset: { x: 0.16, y: -0.76 },
    glowPoints: [{ x: 0.0, y: -0.32, r: 0.36 }],
    desc: 'Feine Konditorei für Winterbeer-Torte, Tiramisu und Matcha-Tiramisu.'
  },
  gift_workshop: {
    id: 'gift_workshop',
    name: 'Geschenkewerkstatt',
    sprite: 'gift_workshop',
    footprint: 2,
    unlockLevel: 3,
    cost: 240,
    recipes: ['wool_scarf', 'cookie_tin', 'mega_gift'],
    chimneyOffset: { x: 0.24, y: -0.74 },
    glowPoints: [{ x: 0.14, y: -0.22, r: 0.32 }, { x: -0.16, y: -0.42, r: 0.24 }],
    desc: 'Werkstatt für Winter-Strickschals, Plätzchendosen und Festtagskörbe.'
  }
};

export const DECORATIONS = {
  pine: {
    id: 'pine',
    name: 'Schneetanne',
    theme: 'Winter',
    sprite: 'deco_pine',
    cost: 30,
    xp: 10,
    unlockLevel: 1,
    glow: false,
    desc: 'Tief verschneite Alpentanne für deinen Waldrand.'
  },
  snowman: {
    id: 'snowman',
    name: 'Schneemann',
    theme: 'Winter',
    sprite: 'deco_snowman',
    cost: 40,
    xp: 14,
    unlockLevel: 1,
    glow: false,
    desc: 'Fröhlicher Schneemann mit gestreiftem Schal und Karottennase.'
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
    desc: 'Taucht deine Dorfwege am Abend in warmes goldenes Licht.'
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
    desc: 'Festlich verpackte Päckchen mit glänzenden Schleifen.'
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
    desc: 'Holzbank mit karierter Winterdecke und Laterne.'
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
    desc: 'Tannenbogen mit warm leuchtender goldener Lichterkette.'
  }
};

export const ACHIEVEMENTS = [
  { id: 'ach_harvest', title: 'Ernte-Freude', desc: 'Ernte 12 Felder auf deinem Winterhof', stat: 'harvests', goal: 12, coins: 45, xp: 20, icon: 'wheat' },
  { id: 'ach_bake', title: 'Ofenmeister', desc: 'Stelle 5 Leckereien in deinen Gebäuden her', stat: 'crafted', goal: 5, coins: 75, xp: 35, icon: 'bakery' },
  { id: 'ach_pet', title: 'Tierfreund', desc: 'Streichle deine Hoftiere 5-mal', stat: 'pets', goal: 5, coins: 50, xp: 25, icon: 'heart' },
  { id: 'ach_orders', title: 'Fleißiger Schlitten', desc: 'Erfülle 4 Dorf-Wunschzettel', stat: 'ordersDone', goal: 4, coins: 100, xp: 50, icon: 'orders' },
  { id: 'ach_stand', title: 'Hofladen-Star', desc: 'Verkaufe 3 Kisten im Hofladen', stat: 'standSales', goal: 3, coins: 80, xp: 40, icon: 'coin' },
  { id: 'ach_villager', title: 'Gute Nachbarschaft', desc: 'Erfülle 2 Haustür-Angebote der Dorfbewohner', stat: 'villagerDeals', goal: 2, coins: 85, xp: 42, icon: 'village' },
  { id: 'ach_land', title: 'Hof-Erweiterung', desc: 'Schalte ein neues Grundstück frei', stat: 'landsUnlocked', goal: 1, coins: 120, xp: 60, icon: 'land' },
  { id: 'ach_barn', title: 'Vorratshaltung', desc: 'Erweitere dein Scheunen-Lager 1-mal', stat: 'barnUpgrades', goal: 1, coins: 90, xp: 45, icon: 'barn' }
];

export const LEVELS = [
  { level: 1,  xpNeeded: 0,    coinBonus: 0,   treeStage: 1, unlockText: 'Willkommen auf deinem Winterhof.' },
  { level: 2,  xpNeeded: 95,   coinBonus: 75,  treeStage: 1, unlockText: 'Freigeschaltet: Hof-Patisserie, Wollschaf, Winter-Matcha, Kakao und Lebkuchen.' },
  { level: 3,  xpNeeded: 240,  coinBonus: 120, treeStage: 2, unlockText: 'Freigeschaltet: Alles-ernten-Sense, Geschenkewerkstatt, Zimt, Stollen und Tiramisu.' },
  { level: 4,  xpNeeded: 450,  coinBonus: 170, treeStage: 2, unlockText: 'Freigeschaltet: Zuckerstangen, Plätzchendose und Schlittenlichtung.' },
  { level: 5,  xpNeeded: 730,  coinBonus: 230, treeStage: 3, unlockText: 'Freigeschaltet: Festtagskorb und Nordlicht-Gipfel. Dein Weihnachtsbaum erstrahlt voll.' },
  { level: 6,  xpNeeded: 1080, coinBonus: 300, treeStage: 3, unlockText: 'Meister der Weihnachtsbäckerei.' },
  { level: 7,  xpNeeded: 1520, coinBonus: 380, treeStage: 3, unlockText: 'Ehrengast des Alpentals.' },
  { level: 8,  xpNeeded: 2050, coinBonus: 480, treeStage: 3, unlockText: 'Hüter des verschneiten Winterhofs.' },
  { level: 9,  xpNeeded: 2700, coinBonus: 600, treeStage: 3, unlockText: 'Meister des Wintertals.' },
  { level: 10, xpNeeded: 3500, coinBonus: 800, treeStage: 3, unlockText: 'Höchste Stufe auf dem Winterhof erreicht.' }
];

export const NPCS = [
  {
    id: 'hilde',
    name: 'Oma Hilde',
    avatarBg: '#9B2226',
    coat: '#9B2226',
    scarf: '#FDE68A',
    hat: '#FAF0E6',
    hair: '#E2E8F0',
    skin: '#F6CBA5',
    quotes: [
      'Für den Adventskaffee fehlen noch frische Butterplätzchen.',
      'Deine knusprigen Waffeln duften bis ins ganze Tal.',
      'Eine Tasse warmer Winterpunsch wärmt das Herz.'
    ]
  },
  {
    id: 'rudi',
    name: 'Förster Rudi',
    avatarBg: '#2D6A4F',
    coat: '#2D6A4F',
    scarf: '#C1121F',
    hat: '#5C3317',
    hair: '#5C3317',
    skin: '#ECC099',
    quotes: [
      'Die Tannen stehen heute prächtig im frischen Schnee.',
      'Nach dem Waldgang wäre eine Heiße Schokolade genau richtig.',
      'Beste Grüße an deine Rentiere und Schneehühner.'
    ]
  },
  {
    id: 'clara',
    name: 'Bäckerin Clara',
    avatarBg: '#B5651D',
    coat: '#8C4A27',
    scarf: '#E0F2FE',
    hat: '#B91C1C',
    hair: '#4A2511',
    skin: '#F8D4B4',
    quotes: [
      'Ein cremiger Matcha-Latte vor dem Backen wirkt Wunder.',
      'Dein Christstollen ist im ganzen Dorf beliebt.',
      'Frisches Tiramisu kommt bei allen Nachbarn gut an.'
    ]
  },
  {
    id: 'nikolaus',
    name: 'Nikolaus',
    avatarBg: '#B91C1C',
    coat: '#B91C1C',
    scarf: '#FFFFFF',
    hat: '#B91C1C',
    hair: '#FFFFFF',
    skin: '#F5C7A3',
    quotes: [
      'Der Schlitten ist startklar für deine nächste Lieferung.',
      'Waffeln, Plätzchen und Zimt – genau mein Geschmack.',
      'Dein Winterhof wächst mit jeder Lieferung prächtig.'
    ]
  }
];

export const CHAPTERS = [
  {
    id: 'ch_1',
    num: 1,
    title: 'Kapitel 1: Erste Ernte',
    goalText: 'Ernte 4 Felder und backe 1x Butterplätzchen',
    check: (s) => (s.stats.harvests || 0) >= 4 && (s.stats.crafted || 0) >= 1,
    coins: 55,
    xp: 35
  },
  {
    id: 'ch_2',
    num: 2,
    title: 'Kapitel 2: Punsch- & Café-Stand',
    goalText: 'Baue den Punsch-Stand und packe die rote Schleife aus',
    check: (s) => s.stations.some((st) => st.type === 'teahouse' && st.built && !st.wrapped),
    coins: 85,
    xp: 55
  },
  {
    id: 'ch_3',
    num: 3,
    title: 'Kapitel 3: Glöckchen-Rentier',
    goalText: 'Hole dir ein Glöckchen-Rentier und erfülle 1 Wunschzettel',
    check: (s) => s.animals.some((a) => a.type === 'reindeer') && (s.stats.ordersDone || 0) >= 1,
    coins: 110,
    xp: 75
  },
  {
    id: 'ch_4',
    num: 4,
    title: 'Kapitel 4: Blühender Winterhof',
    goalText: 'Erfülle 3 Wunschzettel und verkaufe 1x im Hofladen',
    check: (s) => (s.stats.ordersDone || 0) >= 3 && (s.stats.standSales || 0) >= 1,
    coins: 165,
    xp: 110
  }
];

export const BARN_CONFIG = {
  baseCapacity: 50,
  stepCapacity: 25,
  maxCapacity: 300,
  baseCost: 80,
  costStep: 65
};

export function getBarnUpgradeCost(currentCapacity = BARN_CONFIG.baseCapacity) {
  const tier = Math.max(0, Math.floor((currentCapacity - BARN_CONFIG.baseCapacity) / BARN_CONFIG.stepCapacity));
  return BARN_CONFIG.baseCost + tier * BARN_CONFIG.costStep;
}

export const ALBUM_SECRETS = [
  { id: 'secret_chest', title: 'Tages-Schatztruhe', desc: 'Öffne die goldene Schatztruhe am Teichsteg.', check: (s) => (s.stats.chestsOpened || 0) > 0 },
  { id: 'secret_villager', title: 'Haustür-Handel', desc: 'Erfülle ein persönliches Kaufangebot eines Dorfbewohners.', check: (s) => (s.stats.villagerDeals || 0) > 0 },
  { id: 'secret_land', title: 'Neue Grenzen', desc: 'Erweitere deinen Winterhof um ein neues Grundstück.', check: (s) => (s.stats.landsUnlocked || 0) > 0 },
  { id: 'secret_master', title: 'Meisterbäcker', desc: 'Erreiche mindestens 1 Meisterstern an einem Gebäude.', check: (s) => (s.stations || []).some((st) => (st.craftedCount || 0) >= 3) }
];

export function getStationMastery(craftedCount = 0) {
  if (craftedCount >= 18) return { stars: 3, speedMult: 0.8, nextAt: null, label: 'Meister (3/3 · -20 % Zeit)' };
  if (craftedCount >= 9) return { stars: 2, speedMult: 0.88, nextAt: 18, label: 'Profi (2/3 · -12 % Zeit)' };
  if (craftedCount >= 3) return { stars: 1, speedMult: 0.94, nextAt: 9, label: 'Geselle (1/3 · -6 % Zeit)' };
  return { stars: 0, speedMult: 1.0, nextAt: 3, label: 'Anfänger (0/3)' };
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
