# RunData

**시민참여형 러닝 기반 현실세계 데이터 수집·정제 플랫폼**
2026 세계발명학교엑스포(WISE) · 발명 아이디어 & 시제품 부문 · 충남삼성고 남윤수

행정은 신고가 들어온 곳만 봅니다. RunData는 달리는 시민의 동선을 도시 안전 데이터의 관측망으로 전환하여, 민원이 제기되지 않아 파악되지 않던 구역의 실태를 수집·정제해 지방자치단체와 공공기관에 제공합니다.

---

## 핵심 기능

| 역할 | 기능 |
|---|---|
| **의뢰사** | 지역·유형·단가 지정 의뢰 등록 → **미션 오케스트레이션 엔진**이 러너 미션으로 자동 변환 · 수집 현황 대시보드 |
| **러너** | **경로 추천 엔진**(운동효과·수집가치·안전성·커버리지 형평 4목적) · 주행 추적 · 미션 지점 촬영/체감 보고 · 이중 보상(기본 크레딧+성과 보너스)·배지·지역 랭킹 |
| **관리자** | 자동 정제(품질검사·개인정보 마스킹·AI 라벨링) 데이터 검수 · 표준 포맷 데이터셋 패키징·납품 |

## 기술 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** 디자인 시스템 (에메랄드 브랜드 · 라이트/다크)
- **Prisma 7 + SQLite** (better-sqlite3 어댑터)
- **Leaflet + OpenStreetMap**(CartoDB 타일)
- **sharp** 서버사이드 개인정보 마스킹
- 브라우저 Geolocation / 카메라(파일 캡처)

핵심 알고리즘은 `src/lib/engines/` 에 있습니다:
- `orchestration.ts` — 의뢰 → 미션 변환
- `routing.ts` — 4목적 경로 최적화 (커버리지 형평 가중 포함)
- `coverage.ts` — 격자 커버리지 인덱스 및 형평 가중치
- `refinement.ts` — 1차 품질 평가·AI 라벨링
- `mask.ts` — 개인정보 마스킹

## 실행 방법

```bash
npm install
npx prisma migrate dev      # DB 생성 (최초 1회)
npm run db:seed             # 데모 데이터 생성
npm run dev                 # http://localhost:3000
```

### (선택) 실제 도보 경로 — OpenRouteService

경로 추천이 기본은 직선 추정이지만, [OpenRouteService](https://openrouteservice.org) 무료 키를 넣으면 **실제 보행 가능 도로를 따르는 경로**로 바뀝니다.

1. openrouteservice.org 가입 후 API 키 발급
2. `.env`의 `ORS_API_KEY="..."` 에 입력 후 서버 재시작

> 키가 없으면 자동으로 직선 추정 경로로 폴백되므로, 없어도 전체 기능은 정상 동작합니다.
> 러닝 계획 화면 하단에 `실제 도보 경로 반영됨` / `직선 추정 경로`로 현재 상태가 표시됩니다.

### 데모 계정 (비밀번호 모두 `demo1234`)

| 역할 | 이메일 |
|---|---|
| 러너 | `namyunsu1001@naver.com` |
| 의뢰사 (아산시청) | `asan@rundata.kr` |
| 관리자 | `admin@rundata.kr` |

> 로그인 화면에서 **원클릭 데모 로그인**도 가능합니다.

## 폰에서 시연하기

앱은 랩탑에서도 **시뮬레이션 모드**로 전체 흐름 시연이 가능합니다(실제 GPS 불필요).
실제 폰 브라우저로 시연하려면:

1. **같은 WiFi + 로컬 IP** — `npm run dev` 실행 후 폰에서 `http://<랩탑IP>:3000` 접속.
   시뮬레이션 러닝·샘플 촬영은 그대로 동작합니다.
2. **실제 GPS/카메라 사용** — Geolocation은 HTTPS에서만 동작하므로 터널이 필요합니다:
   ```bash
   npx localtunnel --port 3000   # 또는 ngrok http 3000
   ```
   생성된 https 주소로 폰에서 접속.

## 배포

SQLite는 서버리스(예: Vercel)에서 영속되지 않습니다. 배포 시 택 1:

- **Railway / Render / Fly.io** — 영속 디스크에 SQLite 그대로 사용 (가장 간단)
- **Vercel + 관리형 Postgres**(Neon/Supabase) — `schema.prisma`의 provider를 `postgresql`로 변경 후 `prisma migrate`

```bash
npm run build && npm start
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드·실행 |
| `npm run db:seed` | 데모 데이터 시드 |
| `npm run db:reset` | DB 초기화 후 재시드 |
| `npm run typecheck` | 타입 검사 |

---

## 이 저장소에 대해

배포: **https://rundata-namyunsu.fly.dev**

**제19회 전국 학생 창업·발명 경진대회 창업부 우수상** (한국지식재산보호원, 2026-07-28) 수상작이기도 합니다.

공개용으로 정리하면서 아래를 뺐습니다. 코드는 그대로입니다.

- 대회 제출 서식 (`[서식1]` 계열)과 발표 자료
- `dev.db` 개발용 데이터베이스, `.env`
- `public/samples/` 시연용 이미지 279장
- 참고용으로 받아 두었던 외부 저장소 두 개

돌리려면 `.env` 에 `DATABASE_URL` 이 필요합니다.

```bash
npm install
npx prisma migrate dev
npm run dev
```
