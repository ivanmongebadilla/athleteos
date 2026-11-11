import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
export default function Home() { redirect(getSupabaseEnv() ? "/today" : "/setup"); }
