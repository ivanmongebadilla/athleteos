"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, CalendarDays, ChartNoAxesCombined, CircleUserRound, Dumbbell, Sparkles, Sun, Moon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
function readTheme() {
  const saved = localStorage.getItem("athlete-theme");
  return saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches);
}
function subscribeTheme(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener("athlete-theme-change", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("athlete-theme-change", callback);
    media.removeEventListener("change", callback);
  };
}
const navigation = [
  { href: "/today", label: "Today", icon: Activity },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/coach", label: "Coach AI", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: ChartNoAxesCombined },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];
export function Shell({ children, setup = false }: { children: React.ReactNode; setup?: boolean }) {
  const path = usePathname();
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  function toggleTheme() {
    localStorage.setItem("athlete-theme", dark ? "light" : "dark");
    window.dispatchEvent(new Event("athlete-theme-change"));
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Link href={setup ? "/setup" : "/today"} className="brand"><span className="brand-symbol"><Dumbbell size={23}/></span>Athlete<span className="brand-os">OS</span><span className="brand-dot"/></Link>
      <div className="workspace-label">YOUR TRAINING SPACE</div>
      <nav aria-label="Main navigation">{navigation.map(({href,label,icon: Icon}) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`nav-link ${path === href ? "active" : ""}`}><Icon size={20}/><span>{label}</span>{label === "Coach AI" && <span className="ai-badge">AI</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="phase-card"><span className="status-dot"/> FOUNDATION · PHASE 01<p>A stronger foundation.<br/>A better training journey.</p><Link href="/setup">Workspace setup <ArrowUpRight size={14}/></Link></div><div className="sidebar-footer"><span className="avatar">A</span><div><strong>Your athlete workspace</strong><small>{setup ? "Setup required" : "Personal account"}</small></div></div></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><span className="breadcrumb">Workspace <span>/</span> <strong>{setup ? "Getting started" : navigation.find(n => n.href === path)?.label ?? "Training"}</strong></span><div className="topbar-actions"><span className="private-label"><span className="status-dot"/> Personal workspace</span><button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><span className="avatar small">A</span></div></header><main id="main">{children}</main><footer className="page-footer"><span>ATHLETEOS</span><span>Built for the long game.</span></footer></div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({href,label,icon: Icon}) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </div>;
}
