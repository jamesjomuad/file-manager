/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
        source: "/",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/files",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/editor",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/trash",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/favorites",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/recent",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/settings",
        destination: "/workspace",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
