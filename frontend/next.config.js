/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['frappe-gantt'],
  // The standalone backend (../backend) owns auth + API. Proxy through
  // same-origin so session cookies stay first-party (no CORS pain).
  // BACKEND_URL is server-side only; browsers always hit same-origin.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/auth/:path*',
        destination: `${backend}/api/auth/:path*`,
      },
      {
        source: '/api/me',
        destination: `${backend}/api/me`,
      },
    ]
  },
}
module.exports = nextConfig
