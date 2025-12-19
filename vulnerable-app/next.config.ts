import type { NextConfig } from "next";

// Force axios and its dependencies to be bundled
require('./lib/axios-instance');

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
};

export default nextConfig;
