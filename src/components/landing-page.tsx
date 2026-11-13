"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, LockKeyhole, Plus } from "lucide-react";
import { useLocale } from "./locale-provider";
import { PublicShell } from "./public-shell";
export function LandingPage({ authenticated }: { authenticated: boolean }) {
  const { t } = useLocale();
  const cta = authenticated ? "/today" : "/login?mode=signup";
  return <PublicShell landing authenticated={authenticated}>
    <section className="landing-hero" aria-labelledby="hero-heading">
      <Image className="landing-photo" src="/images/athlete-hero.png" alt={t.landing.heroAlt} fill sizes="100vw" preload/><div className="hero-shade"/>
      <div className="landing-hero-copy"><div className="landing-kicker"><span/>{t.landing.eyebrow}</div><h1 id="hero-heading">{t.landing.title}<br/><span>{t.landing.titleEnd}</span></h1><p>{t.landing.intro}</p><div className="hero-ctas"><Link className="landing-button" href={cta}>{authenticated ? t.common.openWorkspace : t.landing.primary}<ArrowUpRight size={18}/></Link><Link className="hero-secondary" href="#approach">{t.landing.explore}<ArrowRight size={17}/></Link></div></div>
      <div className="hero-baseline"><a href="#approach"><ArrowDown size={17}/>{t.landing.scroll}</a><span>{t.landing.heroFoot}</span><span className="hero-coordinate">AO / 01</span></div>
    </section>
    <section className="landing-approach landing-section" id="approach" aria-labelledby="approach-heading"><div className="section-intro"><div className="landing-kicker">{t.landing.philosophyLabel}</div><h2 id="approach-heading">{t.landing.philosophyTitle}</h2><p>{t.landing.philosophyIntro}</p></div><div className="principles">{t.landing.principles.map((item,index) => <article key={index}><span className="principle-index">0{index + 1}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><ArrowUpRight size={20} aria-hidden="true"/></article>)}</div></section>
    <section className="landing-disciplines landing-section" id="disciplines" aria-labelledby="disciplines-heading"><div className="disciplines-heading"><div><div className="landing-kicker">{t.landing.disciplinesLabel}</div><h2 id="disciplines-heading">{t.landing.disciplinesTitle}</h2></div><div className="discipline-emblem" aria-hidden="true"><span>AO</span><div/><div/></div></div><div className="discipline-list">{t.landing.disciplineItems.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.name}</h3><p>{item.detail}</p></article>)}</div></section>
    <section className="landing-access landing-section" aria-labelledby="access-heading"><div className="section-intro"><div className="landing-kicker">{t.landing.accessLabel}</div><h2 id="access-heading">{t.landing.accessTitle}</h2><p>{t.landing.accessIntro}</p><div className="privacy-note"><LockKeyhole size={19}/><div><strong>{t.landing.privacy}</strong><p>{t.landing.privacyBody}</p></div></div></div><div className="release-roadmap"><article className="available"><div className="release-label"><span/>{t.landing.available}</div><h3>{t.landing.availableTitle}</h3><p>{t.landing.availableBody}</p><Link href={cta}>{authenticated ? t.common.openWorkspace : t.common.createAccount}<ArrowRight size={17}/></Link></article><article><div className="release-label">{t.landing.next}</div><h3>{t.landing.nextTitle}</h3><p>{t.landing.nextBody}</p></article><article><div className="release-label">{t.landing.future}</div><h3>{t.landing.futureTitle}</h3><p>{t.landing.futureBody}</p></article></div></section>
    <section className="landing-faq landing-section" aria-labelledby="faq-heading"><h2 id="faq-heading">{t.landing.faqTitle}</h2><div>{t.landing.questions.map((item,index) => <details key={index}><summary>{item.question}<Plus size={19}/></summary><p>{item.answer}</p></details>)}</div></section>
    <section className="landing-final"><div className="landing-kicker">{t.landing.ctaLabel}</div><h2>{t.landing.ctaTitle}</h2><p>{t.landing.ctaBody}</p><Link className="landing-button black" href={cta}>{authenticated ? t.common.openWorkspace : t.common.createAccount}<ArrowUpRight size={18}/></Link>{!authenticated && <div className="existing-account">{t.landing.existing} <Link href="/login">{t.common.signIn}<ArrowUpRight size={13}/></Link></div>}</section>
  </PublicShell>;
}
