import type { NextConfig } from "next";
const preview = process.env.NEXT_PUBLIC_PLAYGROUND === "true";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  ...(preview
    ? {
        output: "export",
        trailingSlash: true,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        images: { unoptimized: true },
      }
    : {}),
};
export default config;
