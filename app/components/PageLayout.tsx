import { Await, Link, useLocation } from 'react-router';
import { Suspense, useId, useEffect } from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import { Aside } from '~/components/Aside';
import { Footer } from '~/components/Footer';
import { Header, HeaderMenu } from '~/components/Header';
import { CartMain } from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import { SearchResultsPredictive } from '~/components/SearchResultsPredictive';
import { HeaderAnimationProvider } from '~/components/HeaderAnimationContext';
import { CartAside } from '~/components/CartAside';
import { SearchAside } from '~/components/SearchAside';
import { MenuAside } from '~/components/MenuAside';
import { HeaderColorProvider, useHeaderColor } from './HeaderColorContext';
import { AnnouncementBar } from '~/components/AnnouncementBar';
import type { AnnouncementItem } from '~/lib/graphql/announcement';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  announcements: AnnouncementItem[];
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout(props: PageLayoutProps) {
  return (
    <HeaderColorProvider>
      <PageLayoutWithHeaderColor {...props} />
    </HeaderColorProvider>
  );
}

function PageLayoutWithHeaderColor({
  cart,
  children = null,
  footer,
  header,
  announcements = [],
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const location = useLocation();
  const { setHeaderColor } = useHeaderColor();

  const isHomePage =
    location.pathname === '/' ||
    /^\/[a-zA-Z]{2}-[a-zA-Z]{2}\/?$/.test(location.pathname);

  useEffect(() => {
    // On non-home pages, always use black header.
    // On the homepage, the HeroSection's IntersectionObserver owns the color
    // so we only set a safe initial fallback and let the hero override it.
    if (!isHomePage) {
      setHeaderColor('black');
    }
    // Don't touch color on homepage — HeroSection handles it per-slide.
  }, [location.pathname, setHeaderColor, isHomePage]);

  const pageTopOffset =
    'calc(var(--header-height) + var(--announcement-height, 0px))';

  return (
    <HeaderAnimationProvider>
      <Aside.Provider>
        <CartAside cart={cart} />
        <SearchAside />
        <MenuAside header={header} publicStoreDomain={publicStoreDomain} />
        {header && (
          <>
            <AnnouncementBar announcements={announcements} />
            <Header
              header={header}
              cart={cart}
              isLoggedIn={isLoggedIn}
              publicStoreDomain={publicStoreDomain}
              showMarginButton={!isHomePage}
              isHomePage={isHomePage}
            />
          </>
        )}
        <main
          style={{
            paddingTop: isHomePage ? undefined : pageTopOffset,
          }}
        >
          {children}
        </main>
        <Footer
          footer={footer}
          header={header}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside.Provider>
    </HeaderAnimationProvider>
  );
}
