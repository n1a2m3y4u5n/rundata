"use client";

import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Fieldset } from "@/components/ui/Field";
import { AlertCircle, Footprints, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<"RUNNER" | "CLIENT">("RUNNER");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            { v: "RUNNER", label: "러너", icon: Footprints },
            { v: "CLIENT", label: "의뢰사", icon: Building2 },
          ] as const
        ).map((r) => (
          <button
            key={r.v}
            type="button"
            onClick={() => setRole(r.v)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all",
              role === r.v
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "border-border text-muted hover:bg-surface-2"
            )}
          >
            <r.icon className="size-4" />
            {r.label}
          </button>
        ))}
      </div>

      <Fieldset label={role === "CLIENT" ? "담당자 이름" : "이름"} htmlFor="name">
        <Input id="name" name="name" placeholder="홍길동" required />
      </Fieldset>

      {role === "CLIENT" && (
        <Fieldset label="기관/회사명" htmlFor="orgName">
          <Input id="orgName" name="orgName" placeholder="○○시청 / ○○연구원" />
        </Fieldset>
      )}

      <Fieldset label="이메일" htmlFor="email">
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
      </Fieldset>
      <Fieldset label="비밀번호" htmlFor="password" hint="6자 이상">
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </Fieldset>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        가입하고 시작하기
      </Button>
    </form>
  );
}
