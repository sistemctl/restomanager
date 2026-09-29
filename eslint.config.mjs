import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Componentes heredados de las fases 1-2 aún usan payloads Prisma sin DTO.
    // El código nuevo mantiene tipos explícitos; esta excepción queda acotada.
    files: [
      "src/features/menu/components/menu-manager.tsx",
      "src/features/mesas/components/mesas-manager.tsx",
      "src/features/pos/components/pos-terminal.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
