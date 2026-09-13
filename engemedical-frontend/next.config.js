/** @type {import('next').NextConfig} */
const isWindows = process.platform === "win32";

const nextConfig = {
  // Em Linux/CI mantemos standalone para Docker.
  // Em Windows local evitamos erro EPERM de symlink durante o build.
  output: isWindows ? undefined : "standalone",

  // Otimização de compilação em desenvolvimento (restringe o bundle de bibliotecas pesadas)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@heroui/react",
      "@heroicons/react",
      "recharts",
      "framer-motion",
      "date-fns",
    ],
  },

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
