"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "./locale-provider";
function readTheme() {
  const saved = localStorage.getItem("athlete-theme");
  return saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
}
function subscribeTheme(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener("athlete-theme-change", callback);
  media.addEventListener("change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("athlete-theme-change", callback); media.removeEventListener("change", callback); };
}
export function ThemeToggle() {
  const { t } = useLocale();
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  return <button className="icon-button" aria-label={dark ? t.common.light : t.common.dark} onClick={() => {
    localStorage.setItem("athlete-theme", dark ? "light" : "dark");
    window.dispatchEvent(new Event("athlete-theme-change"));
  }}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>;
}
