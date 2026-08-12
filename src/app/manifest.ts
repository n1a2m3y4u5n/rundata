import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RunData — 러닝 기반 현실세계 데이터 수집 플랫폼",
    short_name: "RunData",
    description:
      "달리는 시민의 동선을 도시 안전 데이터의 관측망으로 전환하는 시민참여형 데이터 플랫폼",
    start_url: "/",
    display: "standalone",
    background_color: "#070b0a",
    theme_color: "#10b981",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
