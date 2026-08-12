import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 전용 대형 패키지는 번들에 포함하지 않고 런타임에 require (얼굴탐지/이미지 처리)
  serverExternalPackages: [
    "@tensorflow/tfjs",
    "@tensorflow-models/blazeface",
    "sharp",
  ],
};

export default nextConfig;
