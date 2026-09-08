import { FAQ_ITEMS } from '../lib/faq'

const SITE_URL = 'https://srikrishnaadairy.in'

const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'Dairy',
  '@id': `${SITE_URL}/#business`,
  name: 'Sri Krishnaa Dairy Farms',
  url: SITE_URL,
  image: `${SITE_URL}/Logo.jpg`,
  logo: `${SITE_URL}/Logo.jpg`,
  telephone: '+91-8105054473',
  email: 'hello@srikrishnaadairy.in',
  priceRange: '₹₹',
  currenciesAccepted: 'INR',
  paymentAccepted: 'Cash on Delivery, UPI, Card, Net Banking, Wallet',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kattigenahalli',
    addressLocality: 'Bangalore',
    addressRegion: 'Karnataka',
    addressCountry: 'IN',
  },
  areaServed: [
    'Kattigenahalli', 'Hunasamaranahalli', 'Venkatala', 'Sathanur', 'Bagalur Cross',
    'Kogilu', 'Srinivasapura', 'Palahalli', 'Chidananda Reddy Layout', 'Niranthara Layout',
    'Muneshwar Nagar',
  ].map((name) => ({ '@type': 'Place', name })),
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '06:00', closes: '20:00' },
  ],
}

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function JsonLd() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </>
  )
}
