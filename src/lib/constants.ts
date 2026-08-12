// enum 대체 상수 (SQLite enum 미지원)

export const ROLE = {
  RUNNER: "RUNNER",
  CLIENT: "CLIENT",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const DATA_TYPE = {
  IMAGE: "IMAGE",
  OBSERVATION: "OBSERVATION",
  EXPERIENCE: "EXPERIENCE",
} as const;
export type DataType = (typeof DATA_TYPE)[keyof typeof DATA_TYPE];

export const DATA_TYPE_META: Record<
  DataType,
  { label: string; desc: string; icon: string }
> = {
  IMAGE: {
    label: "이미지 촬영",
    desc: "지정 대상을 특정 각도에서 촬영",
    icon: "camera",
  },
  OBSERVATION: {
    label: "관찰 기록",
    desc: "발견 지점의 사진·위치 업로드",
    icon: "eye",
  },
  EXPERIENCE: {
    label: "체감 보고",
    desc: "직접 체험 후 척도에 따라 보고",
    icon: "star",
  },
};

export const MISSION_STATUS = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  COMPLETED: "COMPLETED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;

export const SUBMISSION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

export const REQUEST_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

export const REWARD_TYPE = {
  BASE_CREDIT: "BASE_CREDIT",
  PERFORMANCE_BONUS: "PERFORMANCE_BONUS",
  REDEMPTION: "REDEMPTION",
} as const;

export const BADGE_META: Record<
  string,
  { label: string; desc: string; emoji: string }
> = {
  FIRST_MISSION: { label: "첫 미션", desc: "첫 데이터 수집 완료", emoji: "🎯" },
  FIVE_MISSIONS: { label: "성실한 러너", desc: "미션 5회 완료", emoji: "🏃" },
  QUALITY_PRO: { label: "품질 장인", desc: "고품질 데이터 3건", emoji: "💎" },
  AREA_HERO: { label: "동네 영웅", desc: "한 지역 집중 기여", emoji: "🦸" },
  TOP_CONTRIBUTOR: { label: "톱 기여자", desc: "지역 랭킹 1위", emoji: "👑" },
};

// 데모 기준 위치: 충남 아산 (충남삼성고 인근)
export const DEMO_CENTER = { lat: 36.7898, lng: 127.0018 };

/**
 * 공공 안전 의뢰 프리셋.
 *
 * 자동차가 지나가며 촬영하는 방식(예: 버스·택시 장착 카메라)으로는 얻을 수 없는
 * 항목을 중심으로 구성한다. 러너는 차도가 아닌 보도·골목·공원·하천변을 지나고,
 * 멈춰 서서 지정된 각도로 촬영할 수 있으며, 진동·어두움 같은 체감을 보고할 수 있다.
 */
export const PUBLIC_SAFETY_PRESETS: {
  id: string;
  label: string;
  dataType: DataType;
  title: string;
  description: string;
  instruction: string;
  /** 차량 기반 수집으로 대체 불가능한 이유 */
  whyRunner: string;
}[] = [
  {
    id: "tactile-paving",
    label: "점자블록 실태",
    dataType: "IMAGE",
    title: "관내 횡단보도 점자블록 파손·오설치 실태",
    description:
      "민원이 접수된 지점만이 아니라 관내 전 구역의 점자블록 상태를 파악합니다.",
    instruction: "앞의 횡단보도 점자블록을 정면에서 촬영해 주세요",
    whyRunner: "보도 위 항목이라 차량 카메라로는 촬영 각도가 나오지 않는다",
  },
  {
    id: "sidewalk-crack",
    label: "보도 파손",
    dataType: "IMAGE",
    title: "보도·이면도로 파손 지점 수집",
    description:
      "차량이 다니지 않아 노면 점검에서 누락되는 구간의 파손을 수집합니다.",
    instruction: "보도 갈라짐·들뜸이 보이면 지면이 나오게 촬영해 주세요",
    whyRunner: "이면도로와 골목은 노선버스가 통과하지 않는다",
  },
  {
    id: "streetlight",
    label: "가로등 미점등",
    dataType: "OBSERVATION",
    title: "야간 가로등 미점등 구간 관측",
    description: "조도 대장상 정상이지만 실제로는 꺼져 있는 구간을 찾습니다.",
    instruction: "꺼져 있는 가로등을 발견하면 위치와 함께 기록해 주세요",
    whyRunner: "대장 데이터로는 실제 점등 여부를 알 수 없다",
  },
  {
    id: "night-safety",
    label: "체감 안전도",
    dataType: "EXPERIENCE",
    title: "야간 보행 체감 안전도 평가",
    description:
      "가로등 조도 수치만으로는 드러나지 않는 체감 어두움을 수집합니다.",
    instruction: "이 구간을 지나며 느낀 어두움을 5단계로 평가해 주세요",
    whyRunner: "체감은 사람이 직접 지나야만 생성되는 데이터다",
  },
  {
    id: "shade-gap",
    label: "폭염 그늘 공백",
    dataType: "OBSERVATION",
    title: "폭염 취약 구간 그늘 분포 관측",
    description: "그늘막·수목이 없는 보행 구간을 찾아 우선 설치 지점을 정합니다.",
    instruction: "이 지점에 그늘이 있었는지 표시하고 촬영해 주세요",
    whyRunner: "보행자 눈높이의 그늘 여부는 위성·차량 영상으로 판정하기 어렵다",
  },
  {
    id: "hydrant-block",
    label: "소화전 앞 주정차",
    dataType: "IMAGE",
    title: "소화전·소방차 진입로 주정차 실태",
    description: "화재 시 진입을 막는 상습 구간을 시간대별로 파악합니다.",
    instruction: "소화전 앞 주정차 차량이 있으면 촬영해 주세요 (번호판 자동 마스킹)",
    whyRunner: "이면도로 소화전은 고정 CCTV 사각지대에 있는 경우가 많다",
  },
  {
    id: "footbridge",
    label: "보행교 적합성",
    dataType: "EXPERIENCE",
    title: "신설 보행전용교 이용 적합성 체감 평가",
    description: "준공 검사만으로는 알 수 없는 실제 보행감을 수집합니다.",
    instruction: "다리를 건넌 뒤 진동·보행감을 척도에 따라 보고해 주세요",
    whyRunner: "진동과 흔들림은 직접 건너야만 측정된다",
  },
];
