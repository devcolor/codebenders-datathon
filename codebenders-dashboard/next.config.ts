import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    FORCE_DIRECT_DB: process.env.FORCE_DIRECT_DB ?? "false",
  },
}

export default nextConfig
