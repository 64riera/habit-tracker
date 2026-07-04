"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { LangToggle } from "@/components/nav/lang-toggle";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="flex w-full max-w-[300px] flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-8 shadow-sm"
    >
      <LangToggle />
      <div className="text-center">
        <div className="font-serif-italic text-2xl font-semibold">{t("auth.title")}</div>
        <div className="mt-1 text-[12.5px] text-muted">{t("auth.subtitle")}</div>
      </div>
      <input type="hidden" name="next" value={next} />
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        autoFocus
        placeholder={t("auth.pinLabel")}
        className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-center text-sm tracking-widest outline-none focus:border-text"
      />
      {state.error && (
        <div role="alert" className="text-xs text-cat-fitness">
          {t("auth.error")}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-text px-5 py-2.5 text-sm font-semibold text-surface disabled:opacity-60"
      >
        {t("auth.submit")}
      </button>
    </form>
  );
}
