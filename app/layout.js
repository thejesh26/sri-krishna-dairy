import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Sri Krishnaa Dairy Farms | Fresh Cow Milk Delivery in Kattigenahalli, Bangalore',
  description: 'Get pure fresh cow milk delivered to your doorstep daily in Kattigenahalli, Hunasamaranahalli, Venkatala & nearby areas in Bangalore. Subscribe for daily milk delivery. No preservatives, farm fresh!',
  keywords: 'milk delivery Bangalore, fresh milk Kattigenahalli, cow milk delivery, daily milk subscription, pure milk Bangalore, farm fresh milk, milk delivery Hunasamaranahalli, milk delivery Venkatala, A1 cow milk Bangalore',
  authors: [{ name: 'Sri Krishnaa Dairy Farms' }],
  creator: 'Sri Krishnaa Dairy Farms',
  publisher: 'Sri Krishnaa Dairy Farms',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://sri-krishna-dairy.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Sri Krishnaa Dairy Farms | Fresh Cow Milk Delivery Bangalore',
    description: 'Pure fresh cow milk delivered daily to your doorstep in Kattigenahalli & nearby areas. Subscribe now!',
    url: 'https://sri-krishna-dairy.vercel.app',
    siteName: 'Sri Krishnaa Dairy Farms',
    images: [
      {
        url: '/Logo.jpg',
        width: 800,
        height: 800,
        alt: 'Sri Krishnaa Dairy Farms Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sri Krishnaa Dairy Farms | Fresh Cow Milk Delivery Bangalore',
    description: 'Pure fresh cow milk delivered daily to your doorstep in Kattigenahalli & nearby areas.',
    images: ['/Logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport = {
  themeColor: '#1a5c38',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="SK Dairy" />
  <meta name="mobile-web-app-capable" content="yes" />
</head>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}