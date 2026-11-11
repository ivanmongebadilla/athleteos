import { Layers3 } from "lucide-react";
export function ModulePlaceholder({ title, description, phase }: {title: string; description: string; phase: string}) {
  return <><div className="page-heading"><div><div className="eyebrow">YOUR ATHLETE WORKSPACE</div><h1>{title}<span className="accent">.</span></h1><p>{description}</p></div><span className="outline-tag">{phase}</span></div><section className="panel empty-panel"><Layers3 size={32}/><h2>The foundation is ready</h2><p>This module is planned for {phase.toLowerCase()}. Your account is connected;<br/>training features will follow after Phase 1 approval.</p></section></>;
}
