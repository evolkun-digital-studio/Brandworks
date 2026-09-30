import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import RouteAnalytics from './analytics/RouteAnalytics'
import SmoothScroll from './SmoothScroll'

/**
 * Shared chrome for every public page (Home, /blog, /blog/:slug) —
 * mirrors exactly how src/admin/components/AdminShell.tsx already
 * wraps its own routes with shared chrome + <Outlet/>. Previously
 * Header/Footer were only ever rendered inline inside Home() in
 * App.tsx; extracting them here is what makes /blog and /blog/:slug
 * possible without duplicating that markup.
 *
 * RouteAnalytics (Phase 12) renders nothing — it's mounted here
 * specifically because this component wraps only the public routes,
 * never /admin/*, which is what keeps every analytics provider off
 * the admin panel entirely.
 */
function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <RouteAnalytics />
      <SmoothScroll />
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}

export default PublicLayout
