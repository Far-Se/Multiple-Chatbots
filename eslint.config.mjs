import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node ,
            chrome: "readonly"
        },
        ecmaVersion: 12,
        sourceType: "module"
    },

    rules: {
        
        "no-unused-vars": "warn",
        "no-debugger": "error",
        "curly": ["error", "multi-or-nest"],
        "eqeqeq": ["error", "always"],
        "no-var": "error",
        "prefer-const": "error",
        "quotes": ["error", "double"],
        "semi": ["error", "always"],
        "object-curly-spacing": ["error", "always"],
        "array-bracket-spacing": ["error", "never"],
        "eol-last": ["error", "always"],
        "arrow-spacing": ["error", { "before": true, "after": true }],
        "no-duplicate-imports": "error",
        "template-curly-spacing": ["error", "never"],
        "prefer-arrow-callback": "warn"
    }
}];
