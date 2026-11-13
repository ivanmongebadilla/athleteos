import type { NextConfig } from "next";
const config: NextConfig = {
  // Isolated development browser checks must not rebuild or interrupt the user's preview.
  distDir: process.env.ATHLETEOS_CALENDAR_TEST === "1" ? ".next-calendar-test" : ".next",
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ] }];
  }
};
export default config;
