/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: '/workspace',
        destination: '/',
        permanent: true,
      },
      {
        source: '/files',
        destination: '/',
        permanent: true,
      },
      {
        source: '/recent',
        destination: '/',
        permanent: true,
      },
      {
        source: '/favorites',
        destination: '/',
        permanent: true,
      },
      {
        source: '/editor',
        destination: '/',
        permanent: true,
      },
      {
        source: '/trash',
        destination: '/',
        permanent: true,
      },
      {
        source: '/settings',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
