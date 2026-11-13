import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";
import { PublicShell } from "@/components/public-shell";
export default async function NotFound() {
  const t = await getMessages();
  return <PublicShell><div className="auth-container"><div className="eyebrow">{t.errors.notFoundLabel}</div><h1>{t.errors.notFoundTitle}</h1><p>{t.errors.notFoundBody}</p><Link href="/" className="button lime">{t.common.backHome}</Link></div></PublicShell>;
}
