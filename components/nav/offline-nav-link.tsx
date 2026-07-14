"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useOffline } from "@/lib/offline/client";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode };

/**
 * Next's client-side transition fetches an RSC payload, not a document —
 * if the network drops mid-flight and the destination was never cached,
 * that fetch fails hard (public/sw.js's flight branch has no graceful
 * fallback, unlike its "navigate" branch, which already falls back to
 * /offline). A full navigation to the same href goes through "navigate"
 * instead, so while offline, primary nav links degrade to a plain <a>
 * rather than risk a broken soft transition.
 */
export function OfflineNavLink({ href, ...props }: Props) {
  const { isOnline } = useOffline();
  if (!isOnline) {
    return <a href={href} {...props} />;
  }
  return <Link href={href} {...props} />;
}
