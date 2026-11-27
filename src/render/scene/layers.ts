// ============================================================================
// Ebenen in fester Reihenfolge (hinten → vorn), docs/GRAFIK_TECHNIK.md §3
// Alles, was in der Welt gezeichnet wird, kommt in genau eine dieser Ebenen.
// ============================================================================
import { Container } from 'pixi.js';

export const LAYERS = [
  { id: 'grund', baked: true },           // 1 Schnee im Hof, Wildnis außen, Hofrand
  { id: 'bodenzeichnung', baked: true },  // 2 Wege, Plätze, Acker-Erde
  { id: 'kontaktschatten', baked: true }, // 3 vorgebackene Schattenbilder je Objekt (Entsch. 62), keine Standfläche
  { id: 'objekte', baked: false },        // 4 Gebäude, Bäume, Deko, Tiere, Figuren – nach Tiefe sortiert
  { id: 'effekte', baked: false },        // 5 Rauch, Funkeln, Symbole, Ernte-Flug
  { id: 'auswahl', baked: false }         // 6 Platzier-Vorschau, Markierung
] as const;

export type LayerId = (typeof LAYERS)[number]['id'];

export interface World {
  /** Der eine Welt-Container: Kamera = Verschiebung + Zoom dieses Containers (GRAFIK_TECHNIK §2) */
  root: Container;
  layer: Record<LayerId, Container>;
}

export function createWorld(): World {
  const root = new Container({ label: 'welt' });
  const layer = {} as Record<LayerId, Container>;
  for (const def of LAYERS) {
    const c = new Container({ label: def.id });
    if (def.id === 'objekte') c.sortableChildren = true;
    // Gebackene Ebenen ändern sich nur beim Bauen; Ereignisse prüft nur die Objekt- und Auswahl-Ebene
    if (def.baked) c.eventMode = 'none';
    root.addChild(c);
    layer[def.id] = c;
  }
  return { root, layer };
}

/** Reihenfolge, wie sie tatsächlich im Container steht (für die Prüfung im Browser-Test). */
export function layerOrder(world: World): string[] {
  return world.root.children.map((c) => c.label);
}
