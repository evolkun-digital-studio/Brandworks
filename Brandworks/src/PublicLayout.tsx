import { Outlet } from 'react-router-dom'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import RouteAnalytics from './analytics/RouteAnalytics'
import SmoothScroll from './SmoothScroll'
import Preloader from './components/Preloader/Preloader'

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
 *
 * Preloader is mounted here for the same reason: it plays on a fresh
 * page load of any public route, never on /admin/*, and — since this
 * layout stays mounted across client-side navigation — never again on
 * an in-app route change. It portals itself to <body>.
 */
function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <RouteAnalytics />
      <SmoothScroll />
      <Preloader />
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}

export default PublicLayout
