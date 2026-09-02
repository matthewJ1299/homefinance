import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["web-push", "node-cron"],
  async redirects() {
    return [
      { source: "/categories", destination: "/settings", permanent: false },
      { source: "/split-groups", destination: "/settings", permanent: false },
      { source: "/recurring-income", destination: "/settings", permanent: false },
      { source: "/recurring-expenses", destination: "/settings", permanent: false },
      { source: "/owed-to-me", destination: "/what-i-owe", permanent: false },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
