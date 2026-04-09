export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/wallet', '/profile'],
    },
    sitemap: 'https://srikrishnaadairy.in/sitemap.xml',
  }
}