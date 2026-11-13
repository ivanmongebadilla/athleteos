import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./public.css";
import "./training.css";
import "./session-builder.css";
import "./session-log.css";
import "./progress.css";
import { LocaleProvider } from "@/components/locale-provider";
import { getLocale, getMessages } from "@/lib/i18n/server";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return { title: `AthleteOS — ${t.landing.title} ${t.landing.titleEnd}`, description: t.landing.intro };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale}><body><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
