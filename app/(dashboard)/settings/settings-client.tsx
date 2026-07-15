"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { LangToggle } from "@/components/nav/lang-toggle";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { PushToggle } from "@/components/pwa/push-toggle";
import { SyncPanel } from "@/components/settings/sync-panel";
import { ProfileHeader } from "@/components/settings/profile-header";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { setDayCutoffHour, setCurrencyPreference } from "@/lib/actions/preferences";
import type { FocusHeaderData } from "@/lib/queries/focus";
import type { CurrencyPreference, UserProfile } from "@/lib/queries/user";

const CUTOFF_HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

const CURRENCIES = [
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "USD", label: "USD — US Dollar" },
];

export function AjustesClient({
  cutoffHour,
  focusHeader,
  currency,
  profile,
}: {
  cutoffHour: number;
  focusHeader: FocusHeaderData;
  currency: CurrencyPreference;
  profile: UserProfile | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { canInstall, isIOSManual, promptInstall } = useInstallPrompt();

  function onCutoffChange(hour: number) {
    startTransition(async () => {
      await setDayCutoffHour(hour);
      // The day cutoff changes which date counts as "today" for every page;
      // router.refresh() re-fetches that data without reloading the browser.
      router.refresh();
    });
  }

  function onCurrencyChange(value: string) {
    startTransition(async () => {
      await setCurrencyPreference(value);
      router.refresh();
    });
  }

  // Theme and language use the same interactive controls as the header, so
  // this row does what it says instead of just displaying the current value.
  const rows: { label: string; sub?: string; control: React.ReactNode }[] = [
    { label: t("settings.theme"), control: <ThemeToggle /> },
    { label: t("settings.language"), control: <LangToggle /> },
    {
      label: t("settings.notifications"),
      sub: t("settings.notificationsSub"),
      control: <PushToggle />,
    },
    {
      label: t("settings.dayCutoff"),
      sub: t("settings.dayCutoffSub"),
      control: (
        <Select
          variant="pill"
          value={String(cutoffHour)}
          onValueChange={(v) => onCutoffChange(Number(v))}
          options={CUTOFF_HOURS}
          ariaLabel={t("settings.dayCutoff")}
          className={isPending ? "pointer-events-none opacity-60" : undefined}
        />
      ),
    },
    {
      label: t("settings.currency"),
      sub: t("settings.currencySub"),
      control: (
        <Select
          variant="pill"
          value={currency}
          onValueChange={onCurrencyChange}
          options={CURRENCIES}
          ariaLabel={t("settings.currency")}
          className={isPending ? "pointer-events-none opacity-60" : undefined}
        />
      ),
    },
  ];

  // Installing is only offered if the browser can actually do something with
  // the click: Chrome/Edge/Android fire a native prompt (canInstall);
  // Safari/iOS has no such event, so instructions are shown there instead of
  // a button. If already installed (standalone mode) or the browser doesn't
  // support installation (e.g. desktop Firefox), nothing is shown.
  if (canInstall) {
    rows.push({
      label: t("settings.installApp"),
      sub: t("pwa.installBody"),
      control: (
        <button
          type="button"
          onClick={promptInstall}
          className="rounded-full border border-border px-3 py-1 text-[11.5px] font-medium"
        >
          {t("pwa.install")}
        </button>
      ),
    });
  } else if (isIOSManual) {
    rows.push({ label: t("settings.installApp"), sub: t("pwa.installIos"), control: null });
  }

  return (
    <div>
      <ContentHeader
        titleKey="screens.ajustes.title"
        subtitleKey="screens.ajustes.subtitle"
        showControls={false}
        headerAccessory={<FocusHeaderChip session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />}
      />

      <div className="flex flex-col">
        {profile && <ProfileHeader profile={profile} />}
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-border py-3.5">
            <div>
              <div className="text-[13.5px] font-medium">{row.label}</div>
              {row.sub && <div className="mt-0.5 text-[11px] text-muted">{row.sub}</div>}
            </div>
            {row.control}
          </div>
        ))}
        <SyncPanel />
      </div>

      {/* Plain POST to a Route Handler (not a Server Action): see the comment
          in app/api/auth/logout/route.ts — avoids Next trying to refresh
          this same screen, still authenticated, right after logging out. */}
      <form action="/api/auth/logout" method="post" className="mt-6">
        <button type="submit" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
          <LogOut size={14} strokeWidth={2} aria-hidden />
          {t("settings.logout")}
        </button>
      </form>
    </div>
  );
}
