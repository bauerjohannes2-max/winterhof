// ============================================================================
// Winterhof – neue Darstellung (Neustart, docs/NEUSTART_PLAN.md)
// Baustein 1: nur Einstieg für Werkzeuge und Browser-Test. Pixi folgt in Baustein 3.
// Regeln: docs/GRAFIK_TECHNIK.md. Liest den Kern nur über ../core.
// ============================================================================
import { CONTENT } from '../core';

const root = document.getElementById('neu-root');
if (root) {
  root.dataset['inhalte'] = String(Object.keys(CONTENT.items).length);
  root.dataset['bereit'] = '1';
}
