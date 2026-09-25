import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // next/image: permitir cualquier dominio https (el usuario puede pegar URLs
  // de fotos arbitrarias en fotoOverride; y el respaldo usa raw.githubusercontent).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/webp"],
  },
};

export default nextConfig;
