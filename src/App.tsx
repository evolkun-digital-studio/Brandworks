import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from './PublicLayout'
import { removeLinkTag, removeMetaTag, setDocumentTitle, setLinkTag, setMetaTag } from './blog/lib/documentHead'
import Hero from './Hero'
import Services from './Services'
import About from './About'
import Photography from './Work'
import Work from './WorkWithImpact'
import PhotographyTransition from './components/PhotographyTransition/PhotographyTransition'
import BrandIntelligence from './components/BrandIntelligence/BrandIntelligence'
import TrustedBy from "./TrustedBy";
import Videography from './Videography'
import GraphicsMotionExperience from './components/GraphicsMotion/GraphicsMotionExperience'
import PRReputation from './PRReputation'
// import Photography from './Photography'
import Capabilities from './Capabilities'
import Results from './Results'
import FAQs from './FAQs'
import Blog from './Blog'
import Industries from './Industries'
import Testimonials from './Testimonials'
import Contact from './Contact'
import CTA from './CTA'
import BlogPage from './blog/pages/BlogPage'
import BlogDetailPage from './blog/pages/BlogDetailPage'
import NotFound from './NotFound'
import WebsiteSectionProps from "./Seo";

// Route-level code splitting (Phase 10, Part 13): AdminRoutes pulls in
// the entire CMS — react-markdown's admin preview, the SEO analyzer,
// every admin page — none of which a public visitor has any reason to
// download. Lazy-loading it here means that code lands in its own
// chunk, fetched only when someone actually navigates to /admin/*;
// the public routes above are unaffected (still eager, still exactly
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

  return (
    <>
      <Hero />
      <Services />
      {/* <BrandIntelligence /> */}
      <About />
      <Work />
      <PhotographyTransition />
      <Photography/>
      <Videography />
      <GraphicsMotionExperience />
      <PRReputation />
      {/* <Photography /> */}
      <WebsiteSectionProps />
      <Capabilities />
      <Results />
      <FAQs />
      <Blog />
      <Industries />
      <Testimonials />
      <Contact />
      <CTA />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
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
