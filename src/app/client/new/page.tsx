import { NewRequestForm } from "./NewRequestForm";
import { DEMO_CENTER } from "@/lib/constants";

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">새 데이터 의뢰 등록</h1>
        <p className="mt-1 text-muted">
          지역과 데이터 유형을 지정하면, 오케스트레이션 엔진이 러너 미션으로
          자동 변환합니다.
        </p>
      </div>
      <NewRequestForm defaultCenter={DEMO_CENTER} />
    </div>
  );
}
