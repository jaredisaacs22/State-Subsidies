/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma client must be treated as an external package in server components
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
