"use server";
import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "./messages";
export async function setLanguage(locale: Locale) {
  if (!isLocale(locale)) return;
  (await cookies()).set("athlete-locale", locale, {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true,
    secure: (await headers()).get("x-forwarded-proto") === "https",
  });
}
