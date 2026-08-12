"use client";

import { useTransition } from "react";
import { buildDataset } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Package } from "lucide-react";

export function BuildDatasetButton({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      disabled={disabled}
      onClick={() => start(() => buildDataset(requestId).then(() => {}))}
    >
      <Package className="size-4" /> 데이터셋 생성·납품
    </Button>
  );
}
