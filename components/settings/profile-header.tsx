import type { UserProfile } from "@/lib/queries/user";

/** Account identity at the top of Settings — name/photo only ever come
 * from a Google login (see app/api/auth/google/callback/route.ts) and stay
 * `null` for an account that hasn't used it, so this falls back to the
 * username and an initial-letter avatar (same visual pattern already used
 * for habits/tasks/gym rows without a photo of their own) instead of
 * assuming every account has a name and picture. */
export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const displayName = profile.name ?? profile.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 border-b border-border py-3.5">
      {profile.avatarUrl ? (
        // The app doesn't use next/image anywhere (no remote-image config
        // exists); a single small avatar isn't worth introducing that just here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={displayName}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif-italic text-2xl font-semibold"
          style={{ background: "color-mix(in oklch, var(--color-text) 8%, transparent)", color: "var(--color-muted)" }}
          aria-hidden
        >
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold">{displayName}</div>
        {profile.email && <div className="truncate text-[12px] text-muted">{profile.email}</div>}
      </div>
    </div>
  );
}
