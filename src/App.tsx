import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import PublicLayout from "./PublicLayout";
import { Home } from './Home'
import {
  EditorialArticlePage,
  EditorialIndexPage,
} from "./editorial/EditorialPages";
import NotFound from "./NotFound";
import { ViteNavigationProvider } from './routing/vite'
import AboutPage from "./legacy-pages/AboutPage/AboutPage";
import ServicesPage from "./legacy-pages/servicePage";
import CinematographyPage from "./legacy-pages/services/CinematographyPage";
import TechnologyPage from "./legacy-pages/services/TechnologyPage";
import PhotographyPage from "./legacy-pages/services/PhotographyPage";
import GraphicDesignPage from "./legacy-pages/services/GraphicDesignPage";
import SeoPage from "./legacy-pages/services/SeoPage";
import SocialMediaPage from "./legacy-pages/services/SocialMediaPage";
import SocialClubPage from "./legacy-pages/services/SocialClubPage";
import PerformanceMarketingPage from "./legacy-pages/services/PerformanceMarketingPage";
import { legalRoutes } from "./legacy-pages/legal";
import ContactPage from "./legacy-pages/ContactPage";
import WorkPage from "./legacy-pages/WorkPage";
// import SocialaPage from "./legacy-pages/social/SocialMediaPage";
import PRFounderReputationPage from './legacy-pages/PRFounderReputationPage'
import ConceptCreationPage from './legacy-pages/services/Conceptcreationpage'
import BrandPositioningStrategyPage from './legacy-pages/BrandPositioningStrategyPage'
// Route-level code splitting (Phase 10, Part 13: AdminRoutes pulls in
// as before) and no route path or admin behavior changes.
const AdminRoutes = lazy(() => import("./admin/AdminRoutes"));

function App() {
  return (
    <ViteNavigationProvider>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/work" element={<WorkPage />} /> 
        <Route path="/services/brand-positioning-strategy" element={<BrandPositioningStrategyPage />} />
        <Route path="/services/videography" element={<CinematographyPage />} />
        <Route path="/services/technology" element={<TechnologyPage />} />
        <Route path="/services/photography" element={<PhotographyPage />} />
        <Route path="/services/pr-founder-reputation" element={<PRFounderReputationPage />} />
        <Route path="/services/concept-creation" element={<ConceptCreationPage />} />
        <Route path="/services/content-creation" element={<ConceptCreationPage />} />
        <Route path="/services/graphic-design" element={<GraphicDesignPage />} />
        <Route path="/services/seo" element={<SeoPage />} />
        <Route path="/services/social-media" element={<SocialMediaPage />} />
        <Route path="/services/social-club" element={<SocialClubPage />} />
        {/* <Route path="/services/SocialaPage" element={<SocialaPage />} /> */}
        <Route path="/services/performance-marketing" element={<PerformanceMarketingPage />} />
        {legalRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="/blog" element={<EditorialIndexPage kind="blog" />} />
        <Route
          path="/blog/:slug"
          element={<EditorialArticlePage kind="blog" />}
        />
        <Route path="/news" element={<EditorialIndexPage kind="news" />} />
        <Route
          path="/news/:slug"
          element={<EditorialArticlePage kind="news" />}
        />
        {/* Catch-all for any other path (Phase 13, Part 1/15) — kept
           inside PublicLayout so Header/Footer/RouteAnalytics still
           render; without this, an unmatched path previously rendered
           nothing at all. Never listed in the sitemap. */}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminRoutes />
          </Suspense>
        }
      />
    </Routes>
    </ViteNavigationProvider>
  );
}

export default App;
