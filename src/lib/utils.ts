import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

const won = new Intl.NumberFormat("ko-KR");

/** 1234567 → "1,234,567원" */
export function formatWon(n: number): string {
  return `${won.format(Math.round(n))}원`;
}

export function formatNumber(n: number): string {
  return won.format(Math.round(n));
}

/** 큰 금액 축약: 12000000 → "1,200만원" */
export function formatWonShort(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${won.format(Math.round(n / 10_000))}만원`;
  return `${won.format(n)}원`;
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
