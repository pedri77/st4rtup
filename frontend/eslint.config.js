import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// Extract only the classic rules from react-hooks (exclude react-compiler rules from v7)
const classicHooksRules = {};
for (const [key, value] of Object.entries(reactHooks.configs.recommended.rules)) {
  if (key === "react-hooks/rules-of-hooks" || key === "react-hooks/exhaustive-deps") {
    classicHooksRules[key] = value;
  }
}

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...classicHooksRules,
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
