"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { OfflineNavLink } from "@/components/nav/offline-nav-link";
import { MORE_ITEMS } from "@/components/nav/more-items";
import { useI18n } from "@/lib/i18n/client";

/** No data of its own — just links, so this is the entire page (no
 * server/client split needed the way every other section has one). Tiles
 * are deliberately uncolored (unlike e.g. Gym's --color-cat-fitness): these
 * are unrelated utilities grouped here for space, not a taxonomy, and
 * giving each its own color would suggest a categorization that isn't
 * there. Same icon/label pairing already used in the nav is reused as-is —
 * this screen is just a larger, tappable restatement of it. */
export function MoreClient() {
  const { t } = useI18n();
  return (
    <div>
      <ContentHeader titleKey="screens.more.title" subtitleKey="screens.more.subtitle" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MORE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <OfflineNavLink
              key={item.key}
              href={item.href}
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border py-8 text-center text-text transition-colors active:bg-bg"
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span className="text-[12.5px] font-medium">{t(item.dictKey)}</span>
            </OfflineNavLink>
          );
        })}
      </div>
    </div>
  );
}
