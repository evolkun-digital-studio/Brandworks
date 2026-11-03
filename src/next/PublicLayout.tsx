'use client'

import type { ReactNode } from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import RouteAnalytics from '../analytics/RouteAnalytics'
import SmoothScroll from '../SmoothScroll'
import Preloader from '../components/Preloader/Preloader'
import { useLocation } from '../routing'
import { ConsentProvider } from '../legacy-pages/legal/consent/ConsentProvider'
import type { PublicSiteSettings } from '../server/site-settings/types'

/** Routes that show only the logo: no navigation, footer or preloader, so the page stays focused. */
export const FOCUSED_ROUTES = new Set(['/start-project'])

export default function NextPublicLayout({ children, settings }: { children: ReactNode; settings: PublicSiteSettings }) {
  const { pathname } = useLocation()
  const focused = FOCUSED_ROUTES.has(pathname)
  return (
    <ConsentProvider tracking={{ ga4: settings.tracking.ga4MeasurementId, metaPixel: settings.tracking.metaPixelId }}>
        <div className="min-h-screen bg-white">
          <RouteAnalytics />
          {pathname !== '/services' && <SmoothScroll />}
          {!focused && pathname !== '/services' && <Preloader />}
          <Header navLabels={settings.navLabels} />
          {children}
          {!focused && <Footer contactEmail={settings.contactEmail} footerTagline={settings.footerTagline} socialLinks={settings.socialLinks} />}
        </div>
    </ConsentProvider>
  )
}
