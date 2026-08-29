/** @type {import('next').NextConfig} */
const isWindows = process.platform === "win32";

const nextConfig = {
  // 1. Remova ou comente a linha abaixo para voltar ao padrão ".next"
  // distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next",

  // Em Linux/CI mantemos standalone para Docker.
  // Em Windows local evitamos erro EPERM de symlink durante o build.
  output: isWindows ? undefined : "standalone",

  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
