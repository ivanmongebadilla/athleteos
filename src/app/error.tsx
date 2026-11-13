"use client";
import { useLocale } from "@/components/locale-provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return <main className="auth-container"><h1>{t.errors.title}</h1><p>{t.errors.body}</p><button className="button lime" onClick={reset}>{t.common.retry}</button></main>;
}
