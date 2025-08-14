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
import { useHeaderColor } from './HeaderColorContext';
import { Menu, User, Search, ShoppingCart, ChevronRight } from 'lucide-react';
import { trackPixelEvent, generateEventId } from '~/components/MetaPixel';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  showMarginButton?: boolean;
  isHomePage?: boolean;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
  showMarginButton = false, // keep for prop compatibility, but unused
  isHomePage = false,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const { open } = useAside();
  const { isHeaderVisible } = useHeaderAnimation();
  const headerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const { headerColor } = useHeaderColor();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logoSrc = headerColor === 'black' ? '/black-logo.png' : '/white-logo.png';
  const iconColor = headerColor === 'black' ? '#000' : '#fff';
  const { shop, menu } = header;

  // GSAP animation for header elements
  useGSAP(() => {
    if (!isHomePage) {
      // On non-home pages, ensure header is sharp and static
      gsap.set([leftRef.current, centerRef.current, rightRef.current], {
        filter: 'blur(0px)',
        y: 0,
        willChange: 'filter, transform, opacity',
        force3D: true,
      });
      return;
    }
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
  }, [isHeaderVisible, isHomePage]);

  return (
    <header
      ref={headerRef}
      className={`header custom-header${scrolled ? ' scrolled' : ''}`}
      style={{
        filter: isHomePage ? (isHeaderVisible ? 'blur(0px)' : 'blur(10px)') : 'blur(0px)',
        marginBottom: isHomePage ? undefined : '2rem',
      }}
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  const handleItemClick = (item: any, hasSubItems: boolean) => {
    if (hasSubItems) {
      toggleExpanded(item.id);
    } else {
      close();
    }
  };

  const renderMenuItem = (item: any, level: number = 0) => {
    if (!item.url && (!item.items || item.items.length === 0) && item.type !== 'ACTION') return null;

    const hasSubItems = item.items && item.items.length > 0;
    const isExpanded = expandedItems.has(item.id);

    // if the url is internal, we strip the domain
    const url = item.url ? (
      item.url.includes('myshopify.com') ||
        item.url.includes(publicStoreDomain) ||
        item.url.includes(primaryDomainUrl)
        ? new URL(item.url).pathname
        : item.url
    ) : null;

    return (
      <div key={item.id} className={`menu-item-container level-${level}`}>
        <div className="menu-item-row">
          {url && !hasSubItems ? (
            <NavLink
              className="header-menu-item"
              end
              onClick={close}
              prefetch="intent"
              style={activeLinkStyle}
              to={url}
            >
              {item.title}
            </NavLink>
          ) : (
            <button
              className={`header-menu-item ${hasSubItems ? 'has-sub-items' : ''}`}
              onClick={() => handleItemClick(item, hasSubItems)}
            >
              <span>{item.title}</span>
              {hasSubItems && (
                <ChevronRight
                  size={16}
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: 0.7
                  }}
                />
              )}
            </button>
          )}
        </div>

        {hasSubItems && (
          <div
            className="sub-items-container"
            style={{
              maxHeight: isExpanded ? '500px' : '0px',
              opacity: isExpanded ? 1 : 0,
              transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)'
            }}
          >
            {item.items.map((subItem: any) => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={className} role="navigation">
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => renderMenuItem(item))}
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
      id: 'shop-bundles-menu-item',
      resourceId: null,
      tags: [],
      title: 'Shop Bundles',
      type: 'HTTP',
      url: '/bundles',
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
