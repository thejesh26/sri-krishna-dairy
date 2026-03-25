export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/wallet', '/profile'],
    },
    sitemap: 'https://sri-krishna-dairy.vercel.app/sitemap.xml',
  }
}