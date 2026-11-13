import Link from "next/link";
import { Dumbbell } from "lucide-react";
export function Brand({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="AthleteOS"><span className="brand-symbol"><Dumbbell size={22}/></span>Athlete<span className="brand-os">OS</span><span className="brand-dot"/></Link>;
}
