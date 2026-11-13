"use client";
import { useTrainingMessages } from "@/modules/training/ui";
export default function TrainingError({ reset }: { reset: () => void }) { const t = useTrainingMessages(); return <section className="panel training-panel"><p role="alert">{t.loadError}</p><button className="button lime" onClick={reset}>{t.view}</button></section>; }
