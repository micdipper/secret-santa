import type { NextConfig } from "next";

// Header di sicurezza del browser (da penetration test, 22/11): senza questi il sito si poteva
// incorporare in un iframe altrui (clickjacking) sulle pagine di accesso/invito/reset password.
const headerSicurezza = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: headerSicurezza }];
  },
};

export default nextConfig;
