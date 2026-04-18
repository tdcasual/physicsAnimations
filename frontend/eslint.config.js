import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import importPlugin from "eslint-plugin-import-x";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["src/**/*.{ts,tsx,vue}"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description", "ts-expect-error": false }],
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "warn",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
    },
  },
  {
    files: ["src/views/admin/AdminLibraryView.vue"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/views/admin/library/panels/EmbedProfileCreatePanel.vue", "src/views/admin/library/panels/EmbedProfileEditPanel.vue"],
    rules: {
      "vue/no-mutating-props": "off",
    },
  },
  {
    files: ["src/views/admin/AdminLayoutView.vue"],
    rules: {
      "vue/valid-v-on": "off",
    },
  },
  {
    ignores: ["dist", "node_modules", "public", "**/*.d.ts"],
  },
];
