import type { NextConfig } from 'next';

// '' for localhost / release zip; '/<repo>' for GitHub Pages (set by CI from configure-pages)
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_COMMIT: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString(),
  },
};
export default nextConfig;