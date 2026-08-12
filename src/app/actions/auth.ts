"use server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLE } from "@/lib/constants";

function homeFor(role: string): string {
  if (role === ROLE.CLIENT) return "/client";
  if (role === ROLE.ADMIN) return "/admin";
  return "/run";
}

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  await createSession(user.id);
  redirect(homeFor(user.role));
}

// 공개된 데모 계정(비밀번호 demo1234)만 원클릭 로그인 허용.
// 서버 액션은 미인증 클라이언트도 호출 가능한 공개 엔드포인트이므로,
// 임의 이메일로 세션이 발급되지 않도록 반드시 화이트리스트로 제한한다.
const DEMO_ACCOUNTS = new Set([
  "namyunsu1001@naver.com",
  "asan@rundata.kr",
  "admin@rundata.kr",
]);

export async function quickLogin(email: string): Promise<void> {
  if (!DEMO_ACCOUNTS.has(email)) return;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function signup(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "RUNNER");
  const orgName = String(formData.get("orgName") ?? "").trim() || null;

  if (!email || !password || !name)
    return { error: "필수 항목을 모두 입력하세요." };
  if (password.length < 6)
    return { error: "비밀번호는 6자 이상이어야 합니다." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "이미 가입된 이메일입니다." };

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      name,
      role: role === "CLIENT" ? "CLIENT" : "RUNNER",
      orgName: role === "CLIENT" ? orgName : null,
    },
  });
  await createSession(user.id);
  redirect(homeFor(user.role));
}
