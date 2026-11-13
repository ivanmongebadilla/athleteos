"use client";
import { Globe2 } from "lucide-react";
import { useLocale } from "./locale-provider";
import { isLocale } from "@/lib/i18n/messages";
export function LanguageSwitcher() {
  const { locale, t, pending, changeLanguage } = useLocale();
  return <label className="language-switcher"><Globe2 size={15} aria-hidden="true"/><select aria-label={t.common.language} value={locale} disabled={pending} onChange={(event) => { if (isLocale(event.target.value)) changeLanguage(event.target.value); }}><option value="en">English</option><option value="es">Español</option></select></label>;
}
