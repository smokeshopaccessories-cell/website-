import './globals.css'
import Header from '../components/Header'
import AgeGate from '../components/AgeGate'
import Footer from '../components/Footer'

export const metadata = {
  title: 'Smoke Shop Accessories',
  description: 'Retail and wholesale smoke shop supplies. 21+ only.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AgeGate />
        <div className="mq" aria-hidden="true"><div>
          {[0, 1].map((k) => <span key={k} className="mqs">21+ ONLY · UPS SHIPPING · WHOLESALE PRICING · PAY WITH THE STORE · NEW ARRIVALS WEEKLY</span>)}
        </div></div>
        <Header />
        <main className="w">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
