"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  window.addEventListener("theme-change", onChange);
  return () => window.removeEventListener("theme-change", onChange);
}

/** Light is the default; dark only when the user chose it. */
function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);

  function toggle() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event("theme-change"));
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
