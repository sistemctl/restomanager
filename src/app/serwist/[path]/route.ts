import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision: "fase-6" }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  esbuildOptions: { target: "es2022" },
});
