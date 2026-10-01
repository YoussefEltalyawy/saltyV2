import {useEffect, useState} from 'react';
import {Link, useFetcher} from 'react-router';
import {CheckCircle} from 'lucide-react';
import {safeLocalStorage} from '~/lib/utils';
import {
  CLUB_DEFAULTS,
  type ClubMembershipContent,
} from '~/lib/graphql/club';

/**
 * "Salty Club" membership signup — last section on the homepage, right
 * before the footer. Editorial look inspired by the terms page: tight
 * lowercase title, grey subtitle, dash-marker perk list, then a sharp
 * name / email+phone / black-button form that posts to the same
 * /api/newsletter-subscribe endpoint as the popup.
 *
 * Every text (title, subtitle, perks, placeholders, button, success copy)
 * comes from the `club_membership` metaobject, so it is fully editable
 * from the Shopify dashboard with zero code changes.
 */
export function ClubMembershipSection({
  club,
}: {
  club: ClubMembershipContent | null;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const fetcher = useFetcher();
  const actionData = fetcher.data as
    | {success?: boolean; error?: string; message?: string}
    | undefined;
  const isSubmitting = fetcher.state === 'submitting';
  const isSubmitted = actionData?.success === true;

  useEffect(() => {
    if (actionData?.success) {
      // Same flag the popup uses — stops the popup appearing for members.
      safeLocalStorage.setItem('newsletterSubscribed', 'true');
    }
  }, [actionData?.success]);

  const title = club?.title || CLUB_DEFAULTS.title;
  const subtitle = club?.subtitle || CLUB_DEFAULTS.subtitle;
  const perks =
    club?.perks && club.perks.length > 0 ? club.perks : CLUB_DEFAULTS.perks;
  const buttonLabel = club?.buttonLabel || CLUB_DEFAULTS.buttonLabel;
  const successTitle = club?.successTitle || CLUB_DEFAULTS.successTitle;
  const successMessage =
    club?.successMessage || CLUB_DEFAULTS.successMessage;

  // 16px on mobile stops iOS Safari auto-zooming on focus; sm:text-sm
  // keeps the tighter desktop look.
  const inputClass = (hasError: boolean) =>
    [
      'w-full border bg-white px-4 py-4 text-[16px] tracking-wide text-black placeholder:text-black/40 focus:ring-2 focus:ring-black focus:border-transparent focus:outline-none transition-all sm:text-sm',
      hasError
        ? 'border-red-500'
        : 'border-black/15 focus:border-black',
    ].join(' ');

  return (
    <section className="w-full border-t border-black/10 bg-white">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-xl font-bold tracking-tight text-balance text-black sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-black/40">{subtitle}</p>

        {perks.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {perks.map((perk, index) => (
              <li key={index} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="mt-[0.65em] h-px w-4 shrink-0 bg-black"
                />
                <span className="text-[15px] font-medium tracking-wide text-black sm:text-base">
                  {perk}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8">
          {isSubmitted ? (
            <div className="border border-black/10 bg-black/[0.02] px-6 py-8 text-center">
              <div className="mb-4 flex justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </span>
              </div>
              <p className="text-lg font-bold text-black">{successTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-black/50">
                {successMessage}
              </p>
            </div>
          ) : (
            <fetcher.Form method="post" action="/api/newsletter-subscribe">
              <div className="space-y-3">
                <div>
                  <label htmlFor="club-name" className="sr-only">
                    Name
                  </label>
                  <input
                    type="text"
                    id="club-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      club?.namePlaceholder || CLUB_DEFAULTS.namePlaceholder
                    }
                    className={inputClass(Boolean(actionData?.error))}
                    required
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="club-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      type="email"
                      id="club-email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        club?.emailPlaceholder || CLUB_DEFAULTS.emailPlaceholder
                      }
                      className={inputClass(Boolean(actionData?.error))}
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label htmlFor="club-phone" className="sr-only">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      id="club-phone"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={
                        club?.phonePlaceholder || CLUB_DEFAULTS.phonePlaceholder
                      }
                      className={inputClass(false)}
                      disabled={isSubmitting}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                {actionData?.error ? (
                  <p className="text-sm text-red-600">{actionData.error}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !email.trim()}
                  className="w-full bg-black py-4 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'signing up...' : buttonLabel}
                </button>
              </div>
            </fetcher.Form>
          )}
          {club?.disclaimer ? (
            <p className="mt-4 text-xs leading-relaxed text-black/35">
              {club.disclaimer}
            </p>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-black/35">
              By signing up you agree with our{' '}
              <Link
                to="/pages/terms-conditions"
                className="underline underline-offset-2 hover:text-black"
              >
                terms &amp; conditions
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
