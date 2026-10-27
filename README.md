# RunData

러닝 경로에 공공 점검 미션을 배치해 현실세계 데이터를 모으는 플랫폼입니다.

- 수상: 제2회 세계발명학교엑스포(World Invention School EXPO) 발명 아이디어·시제품 부문 대상 (한국교원단체총연합회장상)

## 소개

행정은 민원이 들어온 곳만 살피기 쉽습니다. RunData는 달리는 시민의 동선을 도시 점검용 관측망으로 씁니다. 의뢰사가 지역과 유형을 정해 의뢰하면 러너용 미션으로 바뀌고, 러너가 촬영한 데이터는 정제를 거쳐 데이터셋으로 납품됩니다. 참여가 사람 많은 곳에만 몰리지 않도록 오래 비어 있는 구역에 가중치를 주는 커버리지 형평 알고리즘을 씁니다.

## 주요 기능

- 의뢰사: 지역·유형·단가를 정해 의뢰를 등록하고, 수집 현황을 확인합니다. 의뢰는 미션 오케스트레이션 엔진이 러너 미션으로 변환합니다.
- 러너: 경로 추천, 주행 추적, 미션 지점 촬영, 기본 크레딧과 성과 보너스 보상, 배지, 지역 랭킹을 이용합니다.
- 경로 추천: 운동 효과, 수집 가치, 안전성, 커버리지 형평 네 가지 목적을 함께 따집니다.
- 커버리지 형평: 도시를 격자로 나누고 격자별 마지막 수집 시각을 추적해, 오래 비어 있을수록 경로 추천과 보상에서 가중치를 높입니다.
- 관리자: 품질 검사, 개인정보 마스킹, 라벨링을 거친 데이터를 검수하고 데이터셋으로 묶어 납품합니다.
- 개인정보 마스킹: 이미지에서 얼굴과 차량 번호판 영역을 찾아 서버에서 가립니다.

## 기술

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Prisma 7 + SQLite (better-sqlite3 어댑터)
- Leaflet 지도, sharp 이미지 처리
- Anthropic SDK 기반 이미지 라벨링·개인정보 영역 탐지 (`ANTHROPIC_API_KEY`가 없으면 규칙 기반으로 대체)
- OpenRouteService 보행 경로 (선택, `ORS_API_KEY`가 없으면 직선 추정 경로)

핵심 알고리즘은 `src/lib/engines/`에 있습니다.

- `orchestration.ts`: 의뢰를 미션으로 변환
- `routing.ts`: 경로 추천
- `coverage.ts`: 격자 커버리지와 형평 가중치
- `refinement.ts`: 품질 평가와 라벨링
- `mask.ts`, `vision.ts`: 개인정보 마스킹과 이미지 분석

## 실행 방법

`.env`에 `DATABASE_URL`이 필요합니다. 선택 항목은 `ANTHROPIC_API_KEY`, `ORS_API_KEY`, `AUTH_SECRET`입니다.

```bash
npm install
npx prisma migrate dev      # DB 생성 (최초 1회)
npm run db:seed             # 데모 데이터 생성
npm run dev                 # http://localhost:3000
```

| 명령 | 설명 |
|---|---|
| `npm run build` / `npm start` | 프로덕션 빌드·실행 |
| `npm run db:reset` | DB 초기화 후 재시드 |
| `npm run typecheck` | 타입 검사 |

GPS와 카메라는 HTTPS에서만 동작합니다. 폰에서 실제 센서로 시험하려면 `npx localtunnel --port 3000` 같은 터널이 필요합니다.
