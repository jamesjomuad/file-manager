import fs from 'fs';
import path from 'path';

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
  onRequestError({ request, error, context }) {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'errors.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = [
      `\n[${timestamp}]`,
      `URL: ${request.url}`,
      `Method: ${request.method}`,
      `Error: ${error.message}`,
      error.stack ? `Stack: ${error.stack}` : null,
      context ? `Context: ${JSON.stringify(context)}` : null,
      '---'
    ].filter(Boolean).join('\n');
    
    fs.appendFileSync(logFile, logEntry + '\n');
    console.error(`[Next.js Error] ${error.message} - logged to ${logFile}`);
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
