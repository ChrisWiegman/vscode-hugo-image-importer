import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["out/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      // complexity
      "no-regex-spaces": "error",
      "no-extra-boolean-cast": "error",
      "no-useless-catch": "error",
      "no-useless-escape": "error",

      // correctness
      "no-constant-condition": "error",
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-nonoctal-decimal-escape": "error",
      "no-self-assign": "error",
      "no-case-declarations": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-optional-chaining": "error",
      "no-unused-labels": "error",
      "no-unused-private-class-members": "error",
      "use-isnan": "error",
      "for-direction": "error",
      "valid-typeof": ["error", { requireStringLiterals: true }],
      "require-yield": "error",

      // style
      "no-var": "error",
      "prefer-const": "error",
      "no-array-constructor": "error",
      "prefer-rest-params": "error",

      // suspicious
      "no-async-promise-executor": "error",
      "no-compare-neg-zero": "error",
      "no-console": "warn",
      "no-constant-binary-expression": "error",
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-dupe-else-if": "error",
      "no-empty": "error",
      "no-fallthrough": "error",
      "no-global-assign": "error",
      "no-irregular-whitespace": "error",
      "no-misleading-character-class": "error",
      "no-prototype-builtins": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-unsafe-negation": "error",
      "no-useless-backreference": "error",
      "no-with": "error",
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
