import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./prisma";

export { hashPassword, verifyPassword } from "./password";

const FALLBACK_SECRET = "rundata-dev-secret-change-me";
const COOKIE = "rd_session";

// 시크릿은 런타임(요청 시점)에 해석한다.
// 프로덕션에서 미설정이면 세션 위조가 가능하므로 실패 처리한다(fail-closed).
// 모듈 로드 시점에 throw하면 빌드가 깨지므로 반드시 호출 시점에 검사한다.
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET 환경변수를 프로덕션에 설정해야 합니다 (세션 서명 키)."
      );
    }
    return FALLBACK_SECRET;
  }
  return secret;
}

function sign(value: string): string {
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
  return `${value}.${sig}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return null;
  return value;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  return unsign(raw);
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
