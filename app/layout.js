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
  metadataBase: new URL('https://srikrishnaadairy.in'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Sri Krishnaa Dairy Farms | Fresh Cow Milk Delivery Bangalore',
    description: 'Pure fresh cow milk delivered daily to your doorstep in Kattigenahalli & nearby areas. Subscribe now!',
    url: 'https://srikrishnaadairy.in',
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
  verification: {
    google: '2iaV5vu4pZ7_qIxTzWZ4FHrOZ84ggtTkUvv9Mc97zRo',
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
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MB9J216FPB"></script>
  <script dangerouslySetInnerHTML={{__html: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-MB9J216FPB');
  `}} />
  <script dangerouslySetInnerHTML={{__html: `
    function _initProtect() {
      document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') e.preventDefault();
      });
      document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') e.preventDefault();
      });
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
          e.preventDefault();
        }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initProtect);
    } else {
      _initProtect();
    }
  `}} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SK Dairy" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script type="text/javascript" dangerouslySetInnerHTML={{__html: `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "w6131yjrnm");
  `}} />
      </head>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}