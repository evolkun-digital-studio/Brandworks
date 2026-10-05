import LegalPage from './LegalPage';
import { legalConfig } from './legal.config';
import privacySource from './content/privacy-policy.md?raw';
import cookieSource from './content/cookie-policy.md?raw';
import termsSource from './content/terms-of-use.md?raw';

const { company, lastUpdated } = legalConfig;

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description={`How ${company.brandName} collects, uses and protects personal data, and the rights you have under India’s DPDP Act.`}
      path="/privacy-policy"
      source={privacySource}
      lastUpdated={lastUpdated.privacy}
      contactHeading="Questions about your data?"
      contactEmail={company.privacyEmail}
    />
  );
}

export function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      description={`The cookies ${company.brandName} uses on this site, what each one does and how to change your choice.`}
      path="/cookie-policy"
      source={cookieSource}
      lastUpdated={lastUpdated.cookies}
      contactHeading="Questions about cookies?"
      contactEmail={company.privacyEmail}
    />
  );
}

export function TermsOfUsePage() {
  return (
    <LegalPage
      title="Terms of use"
      description={`The terms for using the ${company.brandName} website, including how you may use our content and portfolio.`}
      path="/terms-of-use"
      source={termsSource}
      lastUpdated={lastUpdated.terms}
      contactHeading="Questions about these terms?"
      contactEmail={company.email}
    />
  );
}
