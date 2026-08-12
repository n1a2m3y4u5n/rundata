import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/guard";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="mesh-bg flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8">
        <div className="fade-up">
          <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
          <p className="mt-1.5 text-sm text-muted">
            러너 또는 의뢰사로 RunData에 참여하세요.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
          <p className="mt-5 text-center text-sm text-muted">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
