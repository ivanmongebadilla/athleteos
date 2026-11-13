"use client";
import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { messages, type Locale, type Messages } from "@/lib/i18n/messages";
import { setLanguage } from "@/lib/i18n/actions";

const Context = createContext<{ locale: Locale; t: Messages; pending: boolean; changeLanguage: (locale: Locale) => void } | null>(null);
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function changeLanguage(next: Locale) {
    startTransition(async () => { await setLanguage(next); router.refresh(); });
  }
  return <Context.Provider value={{ locale, t: messages[locale], pending, changeLanguage }}>{children}</Context.Provider>;
}
export function useLocale() {
  const context = useContext(Context);
  if (!context) throw new Error("LocaleProvider is required.");
  return context;
}
