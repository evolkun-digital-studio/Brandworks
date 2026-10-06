import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import PublicLayout from "./PublicLayout";
import {
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setLinkTag,
  setMetaTag,
} from "./blog/lib/documentHead";
import Hero from "./components/Hero/Hero";
import BrandStatement from "./components/HumanLedBrandIntelligence";
import Services from "./components/Service/Services";
import About from "./components/About";
import Photography from "./components/Photography";
import Work from "./components/WorkWithImpact"; 
import Videography from "./components/Videography";
import GraphicsMotionExperience from "./components/GraphicsMotion/GraphicsMotionExperience";
import PRReputation from "./components/PrReputation";
import SocialMedia from "./components/SocialMedia/SocialMedia";
import WebDevelopment from "./components/WebDevelopment/WebDevelopment";
// import Photography from './Photography'
import Capabilities from "./components/Capabilities";
import Results from "./components/Results";
import FAQs from "./components/Faq/FAQs";
import Industries from "./components/Industries";
import Testimonials from "./components/Testimonial/Testimonials";
import {
  EditorialArticlePage,
  EditorialIndexPage,
} from "./editorial/EditorialPages";
import NotFound from "./NotFound";
import AboutPage from "./pages/AboutPage/AboutPage";
import WebsiteSectionProps from "./components/Seo";
import ServicesPage from "./pages/servicePage";
import CinematographyPage from "./pages/services/CinematographyPage";
import TechnologyPage from "./pages/services/TechnologyPage";
import PhotographyPage from "./pages/services/PhotographyPage";
import GraphicDesignPage from "./pages/services/GraphicDesignPage";
import SeoPage from "./pages/services/SeoPage";
import SocialMediaPage from "./pages/services/SocialMediaPage";
import SocialClubPage from "./pages/services/SocialClubPage";
import PerformanceMarketingPage from "./pages/services/PerformanceMarketingPage";
import { legalRoutes } from "./pages/legal";
import ContactPage from "./pages/ContactPage";
import WorkPage from "./pages/WorkPage"; 
// import SocialaPage from "./pages/social/SocialMediaPage"; 
import PRFounderReputationPage from './pages/PRFounderReputationPage'
import ConceptCreationPage from './pages/services/Conceptcreationpage'
// Route-level code splitting (Phase 10, Part 13: AdminRoutes pulls in
// as before) and no route path or admin behavior changes.
const AdminRoutes = lazy(() => import("./admin/AdminRoutes"));

// Same copy as the static fallback in index.html — kept in sync
// manually (see that file's own comment) rather than shared, since
// one lives in HTML evaluated before any JS runs and the other is set
// by this effect once React actually mounts.
const HOME_DESCRIPTION =
  "We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.";

// Header/Footer now live in PublicLayout (see App()) so /blog and
// /blog/:slug can share them too — Home itself is unchanged section
// for section, it just no longer renders its own Header/Footer.
// Named export purely for testability (App.test.tsx exercises its
// head-management effect directly) — App itself stays the only thing
// anything else in the app imports.
export function Home() {
  // Phase 13, Part 5/14: the static index.html shell provides
  // title/description/canonical as a no-JS fallback, but every other
  // page's cleanup (BlogPage.tsx/BlogDetailPage.tsx) *removes* its own
  // canonical/description on unmount rather than restoring a previous
  // value — the same convention every one of those pages already
  // follows. Without this effect, visiting /blog and coming back to /
  // would permanently lose the canonical/description the static shell
  // started with, since nothing would ever re-apply it. Setting them
  // here, unconditionally, every time Home mounts closes that gap:
  // whichever page is active is always the one responsible for its
  // own metadata being correct, exactly like the rest of this app.
  useEffect(() => {
    setDocumentTitle("BRANDWORKS");
    setMetaTag("name", "description", HOME_DESCRIPTION);
    setLinkTag("canonical", `${window.location.origin}/`);

    return () => {
      removeMetaTag("name", "description");
      removeLinkTag("canonical");
    };
  }, []);

  // Deep links such as /#photography (used by the Journal's service
  // links). The router doesn't scroll to a hash on its own; waiting a
  // beat lets the pinned sections above measure themselves first.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView({ block: "start" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <main>
      <Hero />
      {/* <HumanLedBrandIntelligence />
       */}
       <BrandStatement />
      <Services />
      {/* <BrandIntelligence /> */}
      <About />
      <Work />
      {/* <PhotographyTransition /> */}
      <Photography />
      <Videography />
      <GraphicsMotionExperience />
      <PRReputation />
      <SocialMedia />
      <WebDevelopment />
      {/* <Photography /> */}
      <WebsiteSectionProps />
      <Capabilities />
      <Results />
      <Industries />
      <FAQs />
      {/* <Blog /> */}
      <Testimonials />
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/work" element={<WorkPage />} /> 
        <Route path="/services/videography" element={<CinematographyPage />} />
        <Route path="/services/technology" element={<TechnologyPage />} />
        <Route path="/services/photography" element={<PhotographyPage />} />
        <Route path="/services/pr-founder-reputation" element={<PRFounderReputationPage />} />
        <Route path="/services/Concept-creation" element={<ConceptCreationPage />} />
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
  );
}

export default App;
