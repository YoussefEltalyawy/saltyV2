import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from 'react-router';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {parseRichText} from '~/lib/richText';
import {LegalPage} from '~/components/LegalPage';

/**
 * Optional brand copy per page handle. Anything not listed here just renders
 * the title, which is the right call for one-off pages like /pages/about-us.
 */
const PAGE_COPY: Record<
  string,
  {eyebrow?: string; intro?: string; inferHeadings?: boolean}
> = {
  'terms-conditions': {
    eyebrow: 'Legal',
    intro:
      'the small print, in plain english — shipping, returns, and everything in between.',
    inferHeadings: true,
  },
};

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const description = data?.page.seo?.description;
  return [
    {title: `SALTY | ${data?.page.title ?? ''}`},
    ...(description ? [{name: 'description', content: description}] : []),
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  request,
  params,
}: LoaderFunctionArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const [{page}] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {
    page,
    // Only legal copy opts into inference; every other CMS page is rendered
    // conservatively so shouty marketing lines aren't mistaken for headings.
    ...parseRichText(page.body, {
      title: page.title,
      inferHeadings: PAGE_COPY[params.handle]?.inferHeadings === true,
    }),
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  return {};
}

export default function Page() {
  const {page, blocks, sections} = useLoaderData<typeof loader>();
  // Non-legal pages (About, lookbooks, …) get no eyebrow/intro, so the layout
  // is a neutral editorial page rather than a legal one.
  const copy = PAGE_COPY[page.handle];

  return (
    <LegalPage
      title={page.title}
      eyebrow={copy?.eyebrow}
      intro={copy?.intro}
      blocks={blocks}
      sections={sections}
    />
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;
