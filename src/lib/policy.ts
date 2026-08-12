// 정책 환류 루프 상수 및 표시 메타
//
// 제보 → 접수 → 점검 → 보수완료 의 상태를 러너에게 되돌려준다.
// 국토교통부 국민참여단이 활동비와 함께 표창·실적 인정을 병행하는 것과 같은 이유로,
// 금전 보상만으로는 참여가 지속되지 않는다. 자신이 지나친 자리가 실제로 고쳐졌다는
// 확인이 가장 강한 유인이다.

export const POLICY_STATUS = {
  RECEIVED: "RECEIVED",
  INSPECTING: "INSPECTING",
  RESOLVED: "RESOLVED",
} as const;

export type PolicyStatus =
  (typeof POLICY_STATUS)[keyof typeof POLICY_STATUS];

export const POLICY_STATUS_ORDER: PolicyStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "RESOLVED",
];

export const POLICY_STATUS_META: Record<
  PolicyStatus,
  { label: string; desc: string; tone: "neutral" | "info" | "success" }
> = {
  RECEIVED: {
    label: "접수됨",
    desc: "담당 부서에 전달되었습니다",
    tone: "neutral",
  },
  INSPECTING: {
    label: "현장 점검 중",
    desc: "담당 부서가 현장을 확인하고 있습니다",
    tone: "info",
  },
  RESOLVED: {
    label: "조치 완료",
    desc: "당신의 제보로 실제 보수가 이루어졌습니다",
    tone: "success",
  },
};

export function policyMeta(status: string) {
  return (
    POLICY_STATUS_META[status as PolicyStatus] ?? POLICY_STATUS_META.RECEIVED
  );
}

export function policyStep(status: string): number {
  const i = POLICY_STATUS_ORDER.indexOf(status as PolicyStatus);
  return i < 0 ? 0 : i;
}
