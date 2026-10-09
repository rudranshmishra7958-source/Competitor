"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("theme-change", onChange);
  mq.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("theme-change", onChange);
    mq.removeEventListener("change", onChange);
  };
}

function current(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
      className="glass grid size-10 place-items-center rounded-xl hover:border-[var(--accent)]"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
