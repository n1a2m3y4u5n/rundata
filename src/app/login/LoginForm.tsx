"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Fieldset } from "@/components/ui/Field";
import { AlertCircle } from "lucide-react";

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <Fieldset label="이메일" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          required
        />
      </Fieldset>
      <Fieldset label="비밀번호" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Fieldset>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        로그인
      </Button>
    </form>
  );
}
