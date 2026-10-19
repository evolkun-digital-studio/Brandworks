'use client'

import type { ReactNode } from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import RouteAnalytics from '../analytics/RouteAnalytics'
import SmoothScroll from '../SmoothScroll'
import Preloader from '../components/Preloader/Preloader'
import { ConsentProvider } from '../legacy-pages/legal/consent/ConsentProvider'
import type { PublicSiteSettings } from '../server/site-settings/types'

export default function NextPublicLayout({ children, settings }: { children: ReactNode; settings: PublicSiteSettings }) {
  return (
    <ConsentProvider>
        <div className="min-h-screen bg-white">
          <RouteAnalytics />
          <SmoothScroll />
          <Preloader />
          <Header navLabels={settings.navLabels} />
          {children}
          <Footer contactEmail={settings.contactEmail} footerTagline={settings.footerTagline} socialLinks={settings.socialLinks} />
        </div>
    </ConsentProvider>
  )
}
