import { Analytics, getShopAnalytics, useNonce } from '@shopify/hydrogen';
import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import { useState, useEffect } from 'react';
import favicon from '~/assets/favicon.ico';
import { FOOTER_QUERY, HEADER_QUERY } from '~/lib/fragments';
import { LOCK_PAGE_QUERY } from '~/graphql/lockQuery';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import { PageLayout } from './components/PageLayout';
import { Aside } from './components/Aside';
import { HeaderAnimationProvider } from './components/HeaderAnimationContext';
import { LockScreen } from '~/components/LockScreen';
import { safeLocalStorage } from '~/lib/localStorage';
import { NewsletterPopup } from '~/components/NewsletterPopup';
import { useNewsletterPopup } from '~/hooks/useNewsletterPopup';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    { rel: 'icon', type: 'image/svg+xml', href: favicon },
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const { storefront, env } = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: true,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({ context }: LoaderFunctionArgs) {
  const { storefront } = context;

  const [header, browseCollections, browseCategories, lockData] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    storefront.query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'browse-collections', // Menu handle for browse collections
      },
    }),
    storefront.query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'browse-categories', // Menu handle for browse categories
      },
    }),
    storefront.query(LOCK_PAGE_QUERY, {
      cache: storefront.CacheNone()
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  const metafields = lockData?.page?.metafields || [];
  const storeLockedMetafield = metafields.find((m: any) => m && m.key === 'store_locked');
  const storeLocked = storeLockedMetafield?.value === 'true';
  const storePassword = metafields.find((m: any) => m && m.key === 'store_password')?.value || '';

  return { header, browseCollections, browseCategories, storeLocked, storePassword };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context }: LoaderFunctionArgs) {
  const { storefront, customerAccount, cart } = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const [isChecking, setIsChecking] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const { isOpen: isNewsletterOpen, closePopup: closeNewsletterPopup } = useNewsletterPopup();

  useEffect(() => {
    if (data) {
      const shouldLock = data.storeLocked === true && typeof data.storePassword === 'string' && data.storePassword.trim() !== '';
      const hasAccess = safeLocalStorage.getItem('storeAccessGranted') === 'true';

      if (hasAccess || !shouldLock) {
        setIsLocked(false);
      }
      setIsChecking(false);
    }
  }, [data]);

  const handlePasswordSuccess = () => setIsLocked(false);

  if (isChecking || !data) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <link rel="stylesheet" href={tailwindCss}></link>
          <link rel="stylesheet" href={resetStyles}></link>
          <link rel="stylesheet" href={appStyles}></link>
          <Meta />
          <Links />
        </head>
        <body>
          <ScrollRestoration nonce={nonce} />
          <Scripts nonce={nonce} />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {data.storeLocked === true && typeof data.storePassword === 'string' && data.storePassword.trim() !== '' && isLocked ? (
          <LockScreen correctPassword={data.storePassword} onPasswordSuccess={handlePasswordSuccess} />
        ) : (
          data ? (
            <Analytics.Provider
              cart={data.cart}
              shop={data.shop}
              consent={data.consent}
            >
              <PageLayout {...data}>{children}</PageLayout>
            </Analytics.Provider>
          ) : (
            <HeaderAnimationProvider>
              <Aside.Provider>{children}</Aside.Provider>
            </HeaderAnimationProvider>
          )
        )}
        <NewsletterPopup isOpen={isNewsletterOpen} onClose={closeNewsletterPopup} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
