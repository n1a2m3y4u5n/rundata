# RunData — Next.js 16 + Prisma(SQLite) + tfjs/blazeface + sharp
FROM node:22-bookworm-slim

# better-sqlite3 네이티브 빌드 폴백 도구 (prebuilt 미제공 시)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./dev.db

# 의존성 (dev 포함 — prisma generate/seed/next build에 필요)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 전체
COPY . .

# Prisma 클라이언트 생성 → 스키마 적용 → 데모 데이터 시드(이미지에 baking) → Next 빌드
RUN npx prisma generate \
    && npx prisma migrate deploy \
    && npx tsx prisma/seed.ts \
    && npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "8080"]
