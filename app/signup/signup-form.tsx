"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { signup, type AuthState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { LangToggle } from "@/components/nav/lang-toggle";
import { GoogleButton } from "@/components/auth/google-button";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

const initialState: AuthState = {};

export function SignupForm({
  next,
  error,
  googleEnabled,
}: {
  next: string;
  error?: string;
  googleEnabled: boolean;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(signup, initialState);
  const displayedError = state.error ?? error;

  // Recarga real del documento (no navegación suave del router) al crear la
  // cuenta: el idioma que corresponde mostrar pasa de "detectado por
  // dispositivo" a "preferencia recién guardada en la cuenta", y el layout
  // raíz compartido por toda la app necesita reflejar eso desde cero.
  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state.redirectTo]);

  return (
    <form
      action={formAction}
      className="relative flex w-full max-w-[300px] flex-col items-center gap-6 rounded-2xl border border-border bg-surface p-8 shadow-sm"
    >
      <div className="absolute top-4 right-4">
        <LangToggle />
      </div>
      <div className="text-center">
        <Link href="/welcome" className="inline-block">
          <div className="font-serif-italic text-[28px] leading-[1.1] font-semibold tracking-tight">
            {APP_NAME}
          </div>
          <div className="mt-1.5 text-[10px] font-medium tracking-[0.16em] text-muted uppercase">
            {APP_TAGLINE}
          </div>
        </Link>
        <div className="mt-4 text-[12.5px] text-muted">{t("auth.signupSubtitle")}</div>
      </div>
      <input type="hidden" name="next" value={next} />
      {displayedError && (
        <div role="alert" className="text-xs text-cat-fitness">
          {t(`auth.errors.${displayedError}`)}
        </div>
      )}
      {googleEnabled ? (
        <GoogleButton next={next} />
      ) : (
        <>
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-username" className="text-[10px] tracking-wide text-muted uppercase">
                {t("auth.usernameLabel")}
              </label>
              <input
                id="signup-username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="text-[10px] tracking-wide text-muted uppercase">
                {t("auth.passwordLabel")}
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || Boolean(state.redirectTo)}
            className="w-full rounded-lg bg-text px-5 py-2.5 text-sm font-semibold text-surface disabled:opacity-60"
          >
            {pending || state.redirectTo ? t("common.loading") : t("auth.signupSubmit")}
          </button>
          <div className="text-xs text-muted">
            {t("auth.haveAccount")}{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-semibold text-text underline"
            >
              {t("auth.loginLink")}
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
