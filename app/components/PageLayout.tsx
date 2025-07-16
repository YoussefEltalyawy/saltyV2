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

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
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
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const location = useLocation();
  const { setHeaderColor } = useHeaderColor();

  const isHomePage =
    location.pathname === '/' ||
    /^\/[a-zA-Z]{2}-[a-zA-Z]{2}\/?$/.test(location.pathname);

  useEffect(() => {
    if (isHomePage) {
      setHeaderColor('default');
    } else {
      setHeaderColor('black');
    }
  }, [location.pathname, setHeaderColor, isHomePage]);

  const headerHeight = 'var(--header-height)';

  return (
    <HeaderAnimationProvider>
      <Aside.Provider>
        <CartAside cart={cart} />
        <SearchAside />
        <MenuAside header={header} publicStoreDomain={publicStoreDomain} />
        {header && (
          <Header
            header={header}
            cart={cart}
            isLoggedIn={isLoggedIn}
            publicStoreDomain={publicStoreDomain}
            showMarginButton={!isHomePage}
            isHomePage={isHomePage}
          />
        )}
        <main
          style={{
            paddingTop: isHomePage ? undefined : headerHeight,
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
