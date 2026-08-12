import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { User } from "@/generated/prisma/client";

export function homeFor(role: string): string {
  if (role === "CLIENT") return "/client";
  if (role === "ADMIN") return "/admin";
  return "/run";
}

/** 로그인 필수. role 지정 시 역할 불일치는 각자 홈으로 리다이렉트 */
export async function requireUser(
  role?: "RUNNER" | "CLIENT" | "ADMIN"
): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}
