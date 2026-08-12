import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowRight,
  Footprints,
  Building2,
  Camera,
  Route,
  ShieldCheck,
  Sparkles,
  MapPin,
  Activity,
  Database,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function Landing() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <ButtonLink
                href={
                  user.role === "CLIENT"
                    ? "/client"
                    : user.role === "ADMIN"
                    ? "/admin"
                    : "/run"
                }
                size="sm"
              >
                내 대시보드 <ArrowRight className="size-4" />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  로그인
                </ButtonLink>
                <ButtonLink href="/login?role=runner" size="sm">
                  시작하기
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mesh-bg relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="fade-up mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="mb-5">
              <Sparkles className="size-3.5" /> 시민참여형 현실세계 데이터 플랫폼
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
              러닝이{" "}
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                데이터가
              </span>
              <br />
              되는 순간
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted">
              행정은 신고가 들어온 곳만 봅니다. 신고할 사람이 없는 동네는
              위험이 없는 곳이 아니라 아직 아무도 보지 않은 곳입니다. RunData는
              달리는 시민의 동선을 도시 안전 데이터의 관측망으로 바꿉니다.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/login?role=runner"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Footprints className="size-5" /> 러너로 시작하기
              </ButtonLink>
              <ButtonLink
                href="/login?role=client"
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <Building2 className="size-5" /> 의뢰사로 시작하기
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted-2">
              데모 계정으로 바로 둘러볼 수 있어요 · 회원가입 불필요
            </p>
          </div>

          {/* Flow */}
          <div className="fade-up mx-auto mt-16 max-w-4xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Building2, t: "의뢰 등록", d: "지역·유형·단가 지정", tone: "accent" as const },
                { icon: Route, t: "미션 변환", d: "경로에 자동 삽입", tone: "brand" as const },
                { icon: Camera, t: "러너 수집", d: "휴식 지점에서 촬영", tone: "brand" as const },
                { icon: Database, t: "정제·납품", d: "검수 후 데이터셋", tone: "accent" as const },
              ].map((s, i) => (
                <div key={s.t} className="relative">
                  <div className="card flex flex-col items-center gap-2 p-5 text-center">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl ${
                        s.tone === "brand"
                          ? "bg-brand-500/12 text-brand-600"
                          : "bg-accent-500/12 text-accent-600"
                      }`}
                    >
                      <s.icon className="size-5" />
                    </div>
                    <div className="text-sm font-semibold">{s.t}</div>
                    <div className="text-xs text-muted">{s.d}</div>
                  </div>
                  {i < 3 && (
                    <ChevronRight className="absolute -right-3.5 top-1/2 hidden size-5 -translate-y-1/2 text-muted-2 sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Runner */}
          <div className="card overflow-hidden p-0">
            <div className="border-b border-border bg-brand-500/[0.06] p-7">
              <Badge tone="brand" className="mb-3">
                <Footprints className="size-3.5" /> 러너
              </Badge>
              <h2 className="text-2xl font-bold">
                달리기가 보상이 되고, 동네가 고쳐집니다
              </h2>
              <p className="mt-2 text-muted">
                미션은 주행 부하가 낮아지는 구간에 배치되어 운동 흐름을 덜
                끊습니다. 제보한 지점의 처리 상태도 되돌려 알려드립니다.
              </p>
            </div>
            <div className="grid gap-1 p-4">
              {[
                { icon: Route, t: "4목적 최적화 경로", d: "운동효과·수집가치·안전성·커버리지 형평을 함께 고려" },
                { icon: Activity, t: "관측 공백 우선 배치", d: "오래 아무도 지나지 않은 격자의 미션을 최대 2.2배 우대" },
                { icon: Sparkles, t: "이중 보상 + 처리 환류", d: "즉시 크레딧과 성과 보너스, 제보 처리 상태 알림" },
              ].map((f) => (
                <FeatureRow key={f.t} {...f} tone="brand" />
              ))}
            </div>
          </div>

          {/* Client */}
          <div className="card overflow-hidden p-0">
            <div className="border-b border-border bg-accent-500/[0.06] p-7">
              <Badge tone="accent" className="mb-3">
                <Building2 className="size-3.5" /> 의뢰사
              </Badge>
              <h2 className="text-2xl font-bold">
                현장에서만 얻는 검증된 실세계 데이터
              </h2>
              <p className="mt-2 text-muted">
                위치와 시간이 검증된 원본 데이터를, 사람이 직접 현장에 가야만
                생성되는 형태로 공급받습니다.
              </p>
            </div>
            <div className="grid gap-1 p-4">
              {[
                { icon: MapPin, t: "어떤 의뢰든 미션으로", d: "이미지·관찰·체감 — 주제가 달라도 동일 체계로 변환" },
                { icon: ShieldCheck, t: "정제된 데이터셋", d: "품질검사·개인정보 마스킹·AI 라벨링·검수 완료" },
                { icon: Database, t: "AI 학습 즉시 활용", d: "출처·시점이 증빙된 표준 포맷으로 납품" },
              ].map((f) => (
                <FeatureRow key={f.t} {...f} tone="accent" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-14 sm:grid-cols-4">
          {[
            { v: "64.5%", l: "도로위험 신고 중 국민참여단 비중" },
            { v: "5 / 10", l: "점자블록 자료 미보유 인천 기초단체" },
            { v: "200m", l: "커버리지 격자 단위" },
            { v: "위치·시간", l: "검증된 현장 데이터" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-num text-3xl font-extrabold tracking-tight text-brand-600 sm:text-4xl">
                {s.v}
              </div>
              <div className="mt-1 text-sm text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="brand-gradient relative overflow-hidden rounded-3xl px-8 py-14 text-center text-white sm:py-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              지금 바로 RunData를 둘러보세요
            </h2>
            <p className="mt-3 text-white/85">
              러너·의뢰사·관리자 데모 계정으로 전체 흐름을 체험할 수 있습니다.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/login"
                size="lg"
                variant="secondary"
                className="w-full border-transparent bg-white text-brand-700 hover:bg-white/90 sm:w-auto"
              >
                데모 시작하기 <ArrowRight className="size-5" />
              </ButtonLink>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-black/10 blur-2xl" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={24} />
          <p className="text-sm text-muted-2">
            2026 세계발명학교엑스포(WISE) · 발명 아이디어 &amp; 시제품 부문 · 충남삼성고 남윤수
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  t,
  d,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  t: string;
  d: string;
  tone: "brand" | "accent";
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl p-3.5 transition-colors hover:bg-surface-2">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          tone === "brand"
            ? "bg-brand-500/12 text-brand-600"
            : "bg-accent-500/12 text-accent-600"
        }`}
      >
        <Icon className="size-4.5" />
      </div>
      <div>
        <div className="font-semibold">{t}</div>
        <div className="text-sm text-muted">{d}</div>
      </div>
    </div>
  );
}
