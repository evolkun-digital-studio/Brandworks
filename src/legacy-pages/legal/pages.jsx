import LegalPage from './LegalPage';
import { legalConfig } from './legal.config';
import {
  cookiePolicySource as cookieSource,
  privacyPolicySource as privacySource,
  termsOfUseSource as termsSource,
} from './content/legalContent';

const { company, lastUpdated } = legalConfig;

const DPDP = 'DPDP Act, 2023';
const DPDP_RULES = 'DPDP Rules, 2025';
const IT_ACT = 'IT Act, 2000';

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description={`How ${company.brandName} collects, uses and protects personal data, and your rights under India’s DPDP Act, 2023 and DPDP Rules, 2025.`}
      path="/privacy-policy"
      source={privacySource}
      lastUpdated={lastUpdated.privacy}
      laws={[DPDP, DPDP_RULES, IT_ACT, 'CERT-In Directions, 2022']}
      summary={[
        { title: 'Only what we need', text: 'Your enquiry details, used only to reply and send a proposal.' },
        { title: 'Never sold', text: 'We don’t sell your data or share it for anyone else’s marketing.' },
        { title: 'Your rights', text: 'Access, correct, erase, withdraw consent and nominate, by email.' },
        { title: 'A real person to ask', text: 'Our Grievance Officer replies within 48 hours, resolves within 90 days.' },
      ]}
      contactHeading="Questions about your data?"
      contactEmail={company.privacyEmail}
    />
  );
}

export function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      description={`The cookies ${company.brandName} uses on this site, what each one does and how to change your choice under India’s DPDP Act.`}
      path="/cookie-policy"
      source={cookieSource}
      lastUpdated={lastUpdated.cookies}
      laws={[DPDP, DPDP_RULES, 'CCPA Dark Patterns Guidelines, 2023']}
      summary={[
        { title: 'Off by default', text: 'Analytics and marketing cookies wait for your yes.' },
        { title: 'A fair choice', text: 'Reject is as easy as Accept. Nothing is pre-ticked.' },
        { title: 'Change anytime', text: 'Cookie settings is linked at the bottom of every page.' },
        { title: 'No tracking of children', text: 'We never target ads at anyone under 18.' },
      ]}
      contactHeading="Questions about cookies?"
      contactEmail={company.privacyEmail}
    />
  );
}

export function TermsOfUsePage() {
  return (
    <LegalPage
      title="Terms of use"
      description={`The terms for using the ${company.brandName} website under Indian law, including how you may use our content and portfolio.`}
      path="/terms-of-use"
      source={termsSource}
      lastUpdated={lastUpdated.terms}
      laws={[IT_ACT, 'Indian Contract Act, 1872', 'Copyright Act, 1957', DPDP]}
      summary={[
        { title: 'Look, don’t lift', text: 'Our work is protected. No copying, scraping or AI training.' },
        { title: 'Client work', text: 'Shown with permission. Ask us and we’ll take anything down.' },
        { title: 'No promised results', text: 'Commitments live in a signed proposal, not on the site.' },
        { title: 'Indian law', text: 'These terms are governed by the laws of India.' },
      ]}
      contactHeading="Questions about these terms?"
      contactEmail={company.email}
    />
  );
}
