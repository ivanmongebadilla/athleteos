import "server-only";
import { cookies } from "next/headers";
import { messages, normalizeLocale } from "./messages";
export async function getLocale() { return normalizeLocale((await cookies()).get("athlete-locale")?.value); }
export async function getMessages() { return messages[await getLocale()]; }
