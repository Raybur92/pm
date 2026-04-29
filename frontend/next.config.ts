import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
};

// In dev mode, proxy /api/* to the backend so Playwright tests work
// without needing a Next.js server in production (static export handles it at the FastAPI level)
if (process.env.NODE_ENV !== "production") {
  nextConfig.rewrites = async () => [
    { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
  ];
}

export default nextConfig;
