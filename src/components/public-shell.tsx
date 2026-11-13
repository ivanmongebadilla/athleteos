"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./locale-provider";
export function PublicShell({ children, landing = false, authenticated = false }: { children: React.ReactNode; landing?: boolean; authenticated?: boolean }) {
  const { t } = useLocale();
  const path = usePathname();
  return <div className={`public-shell ${landing ? "landing-shell" : ""}`}>
    <a className="skip-link" href="#main">{t.common.skip}</a>
    <header className={`public-header ${landing ? "over-hero" : ""}`}><Brand/>
      <nav className="public-links" aria-label={t.shell.navigation}>{landing ? <><Link href="/#approach">{t.landing.approach}</Link><Link href="/#disciplines">{t.landing.disciplines}</Link></> : <Link href="/">{t.common.home}</Link>}</nav>
      <div className="public-actions"><LanguageSwitcher/><ThemeToggle/>{path !== "/login" && <Link className="public-signin" href={authenticated ? "/today" : "/login"}>{authenticated ? t.common.openWorkspace : t.common.signIn}</Link>}</div>
    </header>
    <main className="public-main" id="main">{children}</main>
    <footer className="public-footer"><Brand/><p>{t.common.tagline}</p><span>© {new Date().getFullYear()} AthleteOS</span></footer>
  </div>;
}
