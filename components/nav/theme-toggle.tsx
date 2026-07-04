"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Cambiar tema / Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-[19px] w-[34px] shrink-0 items-center rounded-full bg-border p-[2px] md:h-[22px] md:w-[40px]"
      style={{ justifyContent: isDark ? "flex-end" : "flex-start" }}
    >
      <span className="h-[15px] w-[15px] rounded-full bg-accent md:h-[18px] md:w-[18px]" />
    </button>
  );
}
