import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['127.0.0.1', '192.168.0.106', 'localhost'],
};

export default nextConfig;
