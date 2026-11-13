import Link from "next/link";
import { redirect } from "next/navigation";
import { Database } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { getSupabaseEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n/server";
export default async function Setup() {
  if (getSupabaseEnv()) redirect("/today");
  const t = await getMessages();
  return <PublicShell><div className="auth-container setup-container"><div className="eyebrow">{t.setup.eyebrow}</div><h1>{t.setup.title}<br/>{t.setup.titleEnd}</h1><p>{t.setup.intro}</p><section className="panel"><Database size={24}/><h2>{t.setup.stepsTitle}</h2><div className="connection-status"><span className="status-dot"/>{t.setup.connection}</div><ol className="setup-instructions"><li>{t.setup.step1}</li><li>{t.setup.step2}</li><li>{t.setup.step3}</li></ol><p>{t.setup.readme}</p><Link href="/" className="text-link">{t.setup.back}</Link></section></div></PublicShell>;
}
