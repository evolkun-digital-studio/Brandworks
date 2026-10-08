import { CookiePolicyPage, PrivacyPolicyPage, TermsOfUsePage } from './pages';

/**
 * Route objects for createBrowserRouter, or map them into <Routes>:
 *   {legalRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
 */
export const legalRoutes = [
  { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
  { path: '/cookie-policy', element: <CookiePolicyPage /> },
  { path: '/terms-of-use', element: <TermsOfUsePage /> },
];
