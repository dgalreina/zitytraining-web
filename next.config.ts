import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El navegador no debe servir una copia en caché del propio service
  // worker: si no, un despliegue nuevo podría tardar en llegar a los
  // usuarios (recomendación de la propia guía de PWA de Next.js).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
