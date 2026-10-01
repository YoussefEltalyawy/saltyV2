// Dashboard-editable "Salty Club" membership section (homepage, last block
// before the footer). Same metaobject pattern as newsletter/announcement:
// a single metaobject entry holds every text on the section, so the whole
// block is customizable without code changes.
export const CLUB_METAOBJECT_QUERY = `#graphql
  query ClubMembershipMetaobject($handle: String!, $type: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    metaobject(handle: { type: $type, handle: $handle }) {
      id
      handle
      fields {
        key
        value
      }
    }
  }
` as const;

export const CLUB_METAOBJECT_TYPE = 'club_membership';
export const CLUB_METAOBJECT_HANDLE = 'club-membership';

export type ClubMembershipContent = {
  title?: string;
  subtitle?: string;
  perks: string[];
  buttonLabel?: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  phonePlaceholder?: string;
  /**
   * Small print under the form. When empty, the default renders with a
   * link to the terms page; a custom value renders as plain text.
   */
  disclaimer?: string;
  successTitle?: string;
  successMessage?: string;
};

export const CLUB_DEFAULTS: Required<
  Pick<
    ClubMembershipContent,
    | 'title'
    | 'subtitle'
    | 'buttonLabel'
    | 'namePlaceholder'
    | 'emailPlaceholder'
    | 'phonePlaceholder'
    | 'successTitle'
    | 'successMessage'
  >
> & {perks: string[]} = {
  title: 'only SALTY. members get these benefits:',
  subtitle: 'By signing up you agree with our terms & conditions',
  perks: [
    'access to the sale',
    'early access to all drops',
    'a first look at new collections',
    'limited edition product',
    '14-day returns',
  ],
  buttonLabel: 'sign up',
  namePlaceholder: 'your name *',
  emailPlaceholder: 'email *',
  phonePlaceholder: 'phone number',
  successTitle: 'Welcome to the club!',
  successMessage:
    'You’re in. Keep an eye on your inbox (and phone) for drops, sales and secret perks.',
};

export function parseClubMetaobject(metaobject: any): ClubMembershipContent {
  if (!metaobject?.fields) {
    return {perks: []};
  }

  const fields = Array.isArray(metaobject.fields) ? metaobject.fields : [];
  const byKey: Record<string, any> = Object.fromEntries(
    fields.map((f: any) => [f?.key, f]),
  );

  // Multi-line text field, one perk per line.
  const rawPerks = byKey.perks?.value ?? '';
  const perks = String(rawPerks)
    .split(/\r?\n/)
    .map((line: string) => line.replace(/^\s*[-–—•*·]\s*/, '').trim())
    .filter(Boolean);

  return {
    title: byKey.title?.value || undefined,
    subtitle: byKey.subtitle?.value || undefined,
    perks,
    buttonLabel: byKey.button_label?.value || undefined,
    namePlaceholder: byKey.name_placeholder?.value || undefined,
    emailPlaceholder: byKey.email_placeholder?.value || undefined,
    phonePlaceholder: byKey.phone_placeholder?.value || undefined,
    disclaimer: byKey.disclaimer?.value || undefined,
    successTitle: byKey.success_title?.value || undefined,
    successMessage: byKey.success_message?.value || undefined,
  };
}
