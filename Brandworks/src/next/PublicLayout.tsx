'use client'

import type { ReactNode } from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import RouteAnalytics from '../analytics/RouteAnalytics'
import SmoothScroll from '../SmoothScroll'
import Preloader from '../components/Preloader/Preloader'
import { ConsentProvider } from '../legacy-pages/legal/consent/ConsentProvider'

export default function NextPublicLayout({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
        <div className="min-h-screen bg-white">
          <RouteAnalytics />
          <SmoothScroll />
          <Preloader />
          <Header />
          {children}
          <Footer />
        </div>
    </ConsentProvider>
  )
}
