import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    // Point at the monorepo root so Turbopack finds `next` in the hoisted
    // root node_modules (npm workspaces hoists shared deps).
    root: path.resolve(__dirname, "../.."),
  },

  // ── Security Headers ──
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
        ],
      },
    ];
  },

  // ── Prevent source map leaks in production ──
  productionBrowserSourceMaps: false,
};

export default nextConfig;
