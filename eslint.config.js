// Lint-Regeln Winterhof (Baustein 1, 24.11.2026)
// Wichtigste Aufgabe: Grenzen zwischen Logik-Kern und Darstellung erzwingen.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const ALTE_DARSTELLUNG = ['**/engine/**', '**/world.js', '**/gameData.js', '**/ui/**', '**/sprites.js', '**/main.js', '**/viewport.js'];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'art_src/**', 'src/engine/**', 'src/ui/**', 'src/*.js', 'scripts/**', 'sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      // Kern: kein DOM, keine Grafik, nichts aus der Darstellung.
      'no-restricted-imports': ['error', { patterns: [
        { group: ['pixi.js', 'pixi.js/*'], message: 'Kern zeichnet nicht.' },
        { group: ['**/render/**', ...ALTE_DARSTELLUNG], message: 'Kern darf nichts aus der Darstellung holen.' }
      ] }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'requestAnimationFrame'],
      // Bestehender, getesteter Kern: `!` nach Prüfung und dynamisches delete sind dort bewusst. Neuer Code (render) bleibt streng.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off'
    }
  },
  {
    files: ['src/render/**/*.ts'],
    rules: {
      // Darstellung: nur die öffentliche Kern-Schnittstelle (src/core/index.ts), nie die alte Darstellung.
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/core/*', '!**/core/index'], message: 'Nur über ../core (öffentliche Schnittstelle).' },
        { group: ALTE_DARSTELLUNG, message: 'Alte Darstellung wird nicht weiterverwendet.' }
      ] }]
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' }
  }
);
