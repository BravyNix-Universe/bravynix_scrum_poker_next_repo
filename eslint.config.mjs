import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const TEST_FILES = ["src/**/*.test.{ts,tsx}", "src/test/**"];
const UI_LAYERS = ["./src/app", "./src/components", "./src/features", "./src/lib", "./src/config"];

/**
 * Clean Architecture dependency rule: source code depends only inwards (see ARCHITECTURE.md).
 *
 *   domain  ←  application  ←  infrastructure
 *                    ↑                ↑
 *                 UI (app, features, components)  →  composition (wires adapters to ports)
 */
const LAYER_ZONES = [
  {
    target: "./src/domain",
    from: "./src",
    except: ["./domain"],
    message: "domain is the innermost layer and may import only from domain.",
  },
  {
    target: "./src/application",
    from: "./src",
    except: ["./domain", "./application"],
    message: "application may import only from domain and application. Declare a port instead.",
  },
  {
    target: "./src/infrastructure",
    from: "./src",
    except: ["./domain", "./application", "./infrastructure"],
    message: "infrastructure implements application ports and must not depend on UI code.",
  },
  {
    target: "./src/composition",
    from: UI_LAYERS,
    message: "composition wires adapters to ports and must not depend on UI code.",
  },
  {
    target: UI_LAYERS,
    from: "./src/infrastructure",
    message: "UI code reaches adapters only through @/composition.",
  },
  {
    target: "./src/components",
    from: ["./src/app", "./src/features", "./src/composition"],
    message: "Shared components stay generic: pass data in through props.",
  },
  {
    target: "./src/features",
    from: "./src/app",
    message: "Features must not import routes.",
  },
  {
    target: "./src",
    from: "./src/test",
    message: "Test helpers are for tests only.",
  },
];

/** Platform APIs belong in infrastructure, behind a port, so inner layers stay portable (SDD ADR-09). */
const PORT_MESSAGE = "Use a port; platform APIs belong in infrastructure.";
const PLATFORM_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "crypto",
  "fetch",
].map((name) => ({ name, message: PORT_MESSAGE }));

const UI_FRAMEWORKS = ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*"];
const DRIVER_LIBRARIES = ["peerjs"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Room content, votes and keys must never reach the console (PRD 14.3).
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: TEST_FILES,
    rules: {
      "import/no-restricted-paths": ["error", { zones: LAYER_ZONES }],
    },
  },
  {
    files: ["src/domain/**/*.ts", "src/application/**/*.ts"],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...UI_FRAMEWORKS, ...DRIVER_LIBRARIES],
              message: "domain and application stay framework-free (SDD section 9, ADR-09).",
            },
          ],
        },
      ],
      "no-restricted-globals": ["error", ...PLATFORM_GLOBALS],
      "no-restricted-properties": [
        "error",
        ...["crypto", "localStorage", "indexedDB"].map((property) => ({
          object: "globalThis",
          property,
          message: PORT_MESSAGE,
        })),
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.ts", "src/composition/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: UI_FRAMEWORKS, message: "Adapters must not depend on UI code." }] },
      ],
    },
  },
  {
    // Build scripts report progress on the console.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "design/**", "doc/**"]),
]);

export default eslintConfig;
