'use client'

import SocialMediaPage from '../../../../src/legacy-pages/services/SocialMediaPage'

export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@400,500,600,700&display=swap"
        precedence="social-media-font"
      />
      <SocialMediaPage />
    </>
  )
}
