import { Link } from '../../routing';
import { LEGAL_PAGES } from './legal.config';
import { useConsent } from './consent/ConsentProvider';

/**
 * Links for your footer: the three legal pages plus "Cookie settings",
 * which reopens the cookie preferences. Pass your own classes to match the footer.
 */
export default function LegalLinks({
  className = 'flex flex-wrap gap-x-6 gap-y-2 text-[14px]',
  linkClassName = 'text-black/60 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black',
}) {
  const { hasOptional, openPreferences } = useConsent();

  return (
    <ul className={className}>
      {LEGAL_PAGES.map((page) => (
        <li key={page.path}>
          <Link to={page.path} className={linkClassName}>
            {page.label}
          </Link>
        </li>
      ))}
      {hasOptional && (
        <li>
          <button type="button" onClick={openPreferences} className={linkClassName}>
            Cookie settings
          </button>
        </li>
      )}
    </ul>
  );
}
