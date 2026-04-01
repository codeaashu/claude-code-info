"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white dark:border-white dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-white dark:hover:text-black"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <>
          <span aria-hidden>☀️</span> Light
        </>
      ) : (
        <>
          <span aria-hidden>🌙</span> Dark
        </>
      )}
    </button>
  );
}
