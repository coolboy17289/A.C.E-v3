/** @type {import('next').NextConfig} */
const nextConfig = {
  // The A.C.E backend lives on :4318 (Express + SQLite). We expose it
  // through Next.js so client + server code can keep using relative
  // /api/* URLs. The :path* wildcard forwards every path the SPA hits.
  //
  // Override the upstream host by exporting `ACE_BACKEND` (defaults to
  // http://127.0.0.1:4318) — useful when the backend runs on a
  // different host (Pi kiosk, LAN dev box, staging).
  async rewrites() {
    const backend =
      process.env.ACE_BACKEND?.replace(/\/+$/, '') ?? 'http://127.0.0.1:4318';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
  // Allow the rewrite target to be a different host without tripping
  // the default same-origin checks. Internal-only — keep the host list
  // tight when this graduates to a public deployment.
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
