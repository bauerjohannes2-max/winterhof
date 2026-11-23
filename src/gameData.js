// ============================================================================
// WINTERHOF – Übergangs-Adapter für die alte Oberfläche
// Einzige Datenquelle ist src/content/winterhof.json (wird auch vom Logik-Kern
// src/core gelesen). Diese Datei rechnet nur in das alte Format um.
// NICHT hier Werte ändern – immer in der JSON-Datei.
// ============================================================================
import content from './content/winterhof.json';

export const LAND_ZONES = content.landZones;
export const ITEMS = content.items;
export const CROP_IDS = content.cropIds;
export const ANIMALS = content.animals;
export const STATIONS = content.stations;
export const DECORATIONS = content.decorations;
export const LEVELS = content.levels;
export const NPCS = content.npcs;

// Anzeige erwartet { stat, goal } statt conditions; Statistik hieß dort barnUpgrades.
const legacyStat = (s) => (s === 'storageUpgrades' ? 'barnUpgrades' : s);
export const ACHIEVEMENTS = content.achievements.map((a) => {
  const c = a.conditions[0];
  return { ...a, stat: legacyStat(c.stat), goal: c.goal };
});

// Kapitel: Bedingungen prüft der Logik-Kern (goalReady); hier nur Anzeige-Daten.
export const CHAPTERS = content.chapters;

export const ALBUM_SECRETS = [
  { id: 'secret_chest', title: 'Tages-Schatztruhe', desc: 'Öffne die goldene Schatztruhe am Teichsteg.', check: (s) => (s.stats.chestsOpened || 0) > 0 },
  { id: 'secret_villager', title: 'Haustür-Handel', desc: 'Erfülle ein persönliches Kaufangebot eines Dorfbewohners.', check: (s) => (s.stats.villagerDeals || 0) > 0 },
  { id: 'secret_land', title: 'Neue Grenzen', desc: 'Erweitere deinen Winterhof um ein neues Grundstück.', check: (s) => (s.stats.landsUnlocked || 0) > 0 },
  { id: 'secret_master', title: 'Meisterbäcker', desc: 'Erreiche mindestens 1 Meisterstern an einem Gebäude.', check: (s) => (s.stations || []).some((st) => (st.craftedCount || 0) >= 3) }
];

const MASTERY_LABELS = ['Anfänger (0/3)', 'Geselle (1/3 · -6 % Zeit)', 'Profi (2/3 · -12 % Zeit)', 'Meister (3/3 · -20 % Zeit)'];
export function getStationMastery(craftedCount = 0) {
  let cur = content.mastery[0];
  let nextAt = null;
  for (const m of content.mastery) {
    if (craftedCount >= m.at) cur = m;
    else { nextAt = m.at; break; }
  }
  return { stars: cur.stars, speedMult: cur.speedMult, nextAt, label: MASTERY_LABELS[cur.stars] };
}

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpNeeded) current = lvl;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1) || null;
  const progress = next ? Math.min(1, (xp - current.xpNeeded) / (next.xpNeeded - current.xpNeeded)) : 1;
  return { ...current, next, progress };
}
