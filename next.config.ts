import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      { source: "/categories", destination: "/settings", permanent: false },
      { source: "/split-groups", destination: "/settings", permanent: false },
      { source: "/recurring-income", destination: "/settings", permanent: false },
      { source: "/recurring-expenses", destination: "/settings", permanent: false },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
