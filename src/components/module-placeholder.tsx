"use client";
import { Layers3 } from "lucide-react";
import { useLocale } from "./locale-provider";
export function ModulePlaceholder({ module, phase }: { module: "today" | "calendar" | "coach" | "progress"; phase: number }) {
  const { t } = useLocale();
  const content = t.modules[module];
  return <><div className="page-heading"><div><div className="eyebrow">{t.modules.eyebrow}</div><h1>{content.title}<span className="accent">.</span></h1><p>{content.description}</p></div><span className="outline-tag">{t.common.phase} {phase}</span></div><section className="panel empty-panel"><Layers3 size={32}/><h2>{t.modules.ready}</h2><p>{t.modules.planned} {t.common.phase} {phase}.<br/>{t.modules.upcoming}</p></section></>;
}
