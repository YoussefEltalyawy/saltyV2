import { Suspense, useEffect, useState, useRef } from 'react';
import { Await, NavLink, useAsyncValue } from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { useAside } from '~/components/Aside';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import { Menu, User, Search, ShoppingCart } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const { open } = useAside();
  const { isHeaderVisible } = useHeaderAnimation();
  const headerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logoSrc = scrolled ? '/white-logo.png' : '/white-logo.png';
  const iconColor = scrolled ? '#fff' : '#fff';
  const { shop, menu } = header;

  // GSAP animation for header elements
  useGSAP(() => {
    if (!isHeaderVisible) {
      // Initially hide header elements with blur
      gsap.set([leftRef.current, centerRef.current, rightRef.current], {
        filter: 'blur(10px)',
        y: -20,
        willChange: 'filter, transform, opacity',
        force3D: true,
      });
    } else {
      // Use gsap.context for scoping and cleanup
      const ctx = gsap.context(() => {
        gsap.to([leftRef.current, centerRef.current, rightRef.current], {
          filter: 'blur(0px)',
          y: 0,
          duration: 0.6,
          stagger: 0.3, // Increased stagger for more noticeable timing
          ease: 'power2.out',
          willChange: 'filter, transform, opacity',
          force3D: true,
        });
      }, [leftRef, centerRef, rightRef]);
      return () => ctx.revert();
    }
  }, [isHeaderVisible]);

  return (
    <header
      ref={headerRef}
      className={`header custom-header${scrolled ? ' scrolled' : ''}`}
      style={{ filter: isHeaderVisible ? 'blur(0px)' : 'blur(10px)' }}
    >
      <div ref={leftRef} className="header-left">
        <button className="icon-btn" aria-label="Menu" onClick={() => open('mobile')}>
          <Menu color={iconColor} size={24} />
        </button>
        <NavLink prefetch="intent" to="/account" className="icon-btn" aria-label="Account">
          <User color={iconColor} size={24} />
        </NavLink>
      </div>
      <div ref={centerRef} className="header-center">
        <NavLink prefetch="intent" to="/">
          <img src={logoSrc} alt="Logo" className="header-logo" />
        </NavLink>
      </div>
      <div ref={rightRef} className="header-right">
        <button className="icon-btn" aria-label="Search" onClick={() => open('search')}>
          <Search color={iconColor} size={24} />
        </button>
        <button className="icon-btn" aria-label="Cart" onClick={() => open('cart')}>
          <ShoppingCart color={iconColor} size={24} />
        </button>
      </div>
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const { close } = useAside();

  return (
    <nav className={className} role="navigation">
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
            item.url.includes(publicStoreDomain) ||
            item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
        <Suspense fallback="Sign in">
          <Await resolve={isLoggedIn} errorElement="Sign in">
            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const { open } = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const { open } = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
    </button>
  );
}

function CartBadge({ count }: { count: number | null }) {
  const { open } = useAside();
  const { publish, shop, cart, prevCart } = useAnalytics();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      Cart {count === null ? <span>&nbsp;</span> : count}
    </a>
  );
}

function CartToggle({ cart }: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={null} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}
