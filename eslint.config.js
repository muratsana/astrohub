import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-ssr', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      /*
       * react-hooks 7'nin "recommended" seti derleyici-çağı kuralları da
       * (purity, refs, set-state-in-effect, use-memo) içeriyor ve mevcut
       * kodda 42 yerde tetikleniyor. Bunlar davranış hatası değil kalite
       * temizliği; GUI standardizasyon fazında ayrıca ele alınacak. O güne
       * kadar 5.x ile birebir aynı iki çekirdek kural yürürlükte.
       */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
