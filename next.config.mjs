/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "undici", "https-proxy-agent"],
    // Required on Next 14 for instrumentation.ts to run at all — without it
    // the startup purge/auto-seed is silently ignored.
    instrumentationHook: true,
  },
  // Tree-shake lucide-react icon imports so only used icons are bundled
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
};

export default nextConfig;
