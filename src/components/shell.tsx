"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, ChartNoAxesCombined, CircleUserRound, Sparkles } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./locale-provider";

// Identity is supplied only by the server-verified athlete layout.
export function Shell({ children, athlete }: { children: React.ReactNode; athlete: { name: string; initials: string } }) {
  const path = usePathname();
  const { t } = useLocale();
  const activePath = path.startsWith("/sessions") ? "/calendar" : path;
  const navigation = [
    { href: "/today", label: t.shell.today, icon: Activity },
    { href: "/calendar", label: t.shell.calendar, icon: CalendarDays },
    { href: "/coach", label: t.shell.coach, icon: Sparkles },
    { href: "/progress", label: t.shell.progress, icon: ChartNoAxesCombined },
    { href: "/profile", label: t.shell.profile, icon: CircleUserRound },
  ];
  return <div className="app-shell">
    <a className="skip-link" href="#main">{t.common.skip}</a>
    <aside className="sidebar"><Brand href="/today"/><div className="workspace-label">{t.shell.trainingSpace}</div>
      <nav aria-label={t.shell.navigation}>{navigation.map(({href,label,icon: Icon}) => <Link key={href} href={href} aria-current={activePath === href ? "page" : undefined} className={`nav-link ${activePath === href ? "active" : ""}`}><Icon size={20}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-footer"><span className="avatar">{athlete.initials}</span><div><strong>{athlete.name}</strong><small>{t.shell.account}</small></div></div></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><span className="breadcrumb">{t.common.workspace}<span>/</span><strong>{navigation.find(n => n.href === activePath)?.label ?? t.shell.today}</strong></span><div className="topbar-actions"><LanguageSwitcher/><ThemeToggle/><Link href="/profile" className="avatar small" aria-label={t.shell.profile}>{athlete.initials}</Link></div></header><main id="main">{children}</main><footer className="page-footer"><span>ATHLETEOS</span><span>{t.common.tagline}</span></footer></div>
    <nav className="mobile-nav" aria-label={t.shell.mobileNavigation}>{navigation.map(({href,label,icon: Icon}) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </div>;
}
