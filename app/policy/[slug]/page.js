import { STORE } from '../../../lib/store'

const POLICIES = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect the information you give us when you create an account or place an order request: your name, email, phone number, city, date of birth, and, for wholesale applicants, your business documents.',
      'We use this information to verify your age and business, process order requests, contact you about your orders, and respond to messages. We do not sell your personal information.',
      'Wholesale documents are stored privately and are visible only to you and our staff. You can ask us to correct or delete your information by contacting the store.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      'You must be 21 or older to use this website or buy from us. We may ask for proof of age at any time.',
      'This website takes order requests only. No payment is taken online. After you submit a request, our team confirms availability, adds the UPS shipping total, and contacts you to arrange payment.',
      'Prices and availability can change. Wholesale prices are shown only to approved wholesale customers and are for resale by licensed businesses. We may refuse or cancel any order request.',
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    body: [
      'All products on this website are intended for adults 21 years of age or older. Some products contain nicotine, which is an addictive chemical. Keep out of reach of children and pets.',
      'Product images, descriptions and packaging are shown for illustration and may differ from the item you receive. Prices, availability and product details can change without notice, and we are not responsible for typographical or pricing errors.',
      'Information on this website is general information only. It is not medical advice and is not intended to diagnose, treat, cure or prevent any condition. Please follow all local, state and federal laws that apply to the products you buy.',
      'All trademarks, logos and brand names are the property of their respective owners. We are an independent retailer, and the use of a brand name does not mean we are affiliated with or endorsed by that brand.',
    ],
  },
  returns: {
    title: 'Product Returns',
    body: [
      'If there is a problem with your order, please contact the store as soon as you receive it so we can help.',
      'Details such as the return period and which items can be returned are set by the store. Please add your policy here.',
    ],
  },
}

export function generateMetadata({ params }) {
  return { title: (POLICIES[params.slug]?.title || 'Policy') + ' | ' + STORE.name }
}

export default function Policy({ params }) {
  const p = POLICIES[params.slug]
  if (!p) return <div className="card"><h2>Page not found</h2></div>
  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <h1>{p.title}</h1>
      <p className="note"><b>Draft:</b> please have this page reviewed by a lawyer before you rely on it.</p>
      {p.body.map((t, i) => <p key={i}>{t}</p>)}
      <p className="mute">Questions? {STORE.email ? 'Email ' + STORE.email : 'Contact the store.'}{STORE.phone ? ' or call ' + STORE.phone : ''}</p>
    </div>
  )
}
