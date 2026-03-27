import { Helmet } from 'react-helmet-async'

const DEFAULTS = {
  title: 'St4rtup — CRM de ventas para startups',
  description: 'CRM de ventas y marketing para startups. Pipeline, emails, llamadas IA, SEO, automatizaciones. Todo en uno. Empieza gratis.',
  image: 'https://st4rtup.com/images/logo-white.webp',
  url: 'https://st4rtup.com',
}

export default function SEO({ title, description, image, path = '', noindex = false }) {
  const fullTitle = title ? `${title} — St4rtup` : DEFAULTS.title
  const desc = description || DEFAULTS.description
  const img = image || DEFAULTS.image
  const url = `${DEFAULTS.url}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="St4rtup" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  )
}
