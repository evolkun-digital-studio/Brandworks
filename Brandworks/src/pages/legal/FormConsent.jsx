import { useId } from 'react';
import { Link } from 'react-router-dom';
import { legalConfig } from './legal.config';

/**
 * Put this under the submit button of every contact or enquiry form.
 *
 * <FormConsent />               just the privacy notice
 * <FormConsent marketing />     adds an unticked opt-in for marketing emails.
 *                               The form then sends marketingOptIn=on when ticked.
 *
 * Keep the checkbox unticked by default: a pre-ticked box isn't valid consent.
 */
export default function FormConsent({ marketing = false, name = 'marketingOptIn', className = '' }) {
  const id = useId();

  return (
    <div className={`font-secondary space-y-3 text-[14px] leading-relaxed text-black/65 ${className}`}>
      <p>
        We’ll use your details only to reply to your enquiry and send you a proposal. See our{' '}
        <Link
          to="/privacy-policy"
          className="text-black underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          privacy policy
        </Link>
        .
      </p>
      {marketing && (
        <div className="flex items-start gap-3">
          <input id={id} type="checkbox" name={name} className="mt-1 size-4 shrink-0 accent-black" />
          <label htmlFor={id}>
            Email me occasional updates about {legalConfig.company.brandName} projects. You can unsubscribe at any
            time.
          </label>
        </div>
      )}
    </div>
  );
}
