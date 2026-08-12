import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";
import { quickLogin } from "@/app/actions/auth";
import { Footprints, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const DEMO = [
  {
    role: "runner",
    email: "namyunsu1001@naver.com",
    name: "남윤수",
    label: "러너로 체험",
    desc: "달리며 미션 수행·데이터 수집",
    icon: Footprints,
    tone: "brand" as const,
  },
  {
    role: "client",
    email: "asan@rundata.kr",
    name: "아산시청",
    label: "의뢰사로 체험",
    desc: "데이터 의뢰 등록·수집 현황",
    icon: Building2,
    tone: "accent" as const,
  },
  {
    role: "admin",
    email: "admin@rundata.kr",
    name: "운영관리자",
    label: "관리자로 체험",
    desc: "데이터 검수·정제·납품",
    icon: ShieldCheck,
    tone: "neutral" as const,
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(
      user.role === "CLIENT" ? "/client" : user.role === "ADMIN" ? "/admin" : "/run"
    );
  }
  const { role } = await searchParams;
  const highlight = role ?? "runner";
  const defaultEmail = DEMO.find((d) => d.role === highlight)?.email;

  return (
    <div className="mesh-bg flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8">
        <div className="fade-up">
          <h1 className="text-2xl font-bold tracking-tight">
            데모 계정으로 시작
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            원하는 역할을 선택하면 바로 로그인됩니다.
          </p>

          {/* Quick demo login */}
          <div className="mt-6 space-y-2.5">
            {DEMO.map((d) => (
              <form key={d.role} action={quickLogin.bind(null, d.email)}>
                <button
                  type="submit"
                  className={`card group flex w-full items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04] ${
                    d.role === highlight
                      ? "ring-2 ring-brand-500/40"
                      : "hover:border-border-strong"
                  }`}
                >
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                      d.tone === "brand"
                        ? "bg-brand-500/12 text-brand-600"
                        : d.tone === "accent"
                        ? "bg-accent-500/12 text-accent-600"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    <d.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{d.label}</div>
                    <div className="truncate text-sm text-muted">{d.desc}</div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            ))}
          </div>

          {/* Divider */}
          <div className="my-7 flex items-center gap-3 text-xs text-muted-2">
            <div className="h-px flex-1 bg-border" />
            또는 직접 로그인
            <div className="h-px flex-1 bg-border" />
          </div>

          <LoginForm defaultEmail={defaultEmail} />

          <p className="mt-5 text-center text-sm text-muted">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
              회원가입
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-2">
            데모 비밀번호는 모두 <code className="font-mono">demo1234</code>
          </p>
        </div>
      </main>
    </div>
  );
}
