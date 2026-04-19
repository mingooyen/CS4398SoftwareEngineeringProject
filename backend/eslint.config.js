import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Relax for now; many handlers/services have stub params for API consistency
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  }
);
