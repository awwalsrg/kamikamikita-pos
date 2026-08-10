import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router does not use api.bodyParser config.
  // Body size limits are handled per-route or at the server (nginx) level.
  // See app/api/upload/route.ts for route-level handling.
};

export default nextConfig;
