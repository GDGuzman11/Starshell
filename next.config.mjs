/** @type {import('next').NextConfig} */

// STATIC_EXPORT=1 produces a fully static `out/` bundle (no server) for the native
// app shell (Capacitor). The default build stays a normal Next app so a server
// target (the backend API) can live in this repo later. The game is client-only
// (Three.js + localStorage), so it exports cleanly and runs offline.
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
