// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://10.10.5.27:5000/api/:path*'
      }
    ];
  }
};

export default nextConfig;
