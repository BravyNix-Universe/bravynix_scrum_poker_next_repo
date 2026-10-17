import type { NextConfig } from "next";

import packageJson from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  // Static HTML/CSS/JS in `out/`, uploaded to Hostinger. There is no Node server.
  output: "export",
  // Emit `/r/index.html` rather than `/r.html` so every static host serves `/r/` without rewrites.
  trailingSlash: true,
  images: { unoptimized: true },
  // Shown in the connection diagnostics panel (PRD FR-053).
  env: { NEXT_PUBLIC_APP_VERSION: packageJson.version },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
