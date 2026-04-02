import { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import { useHeaderColor } from '~/components/HeaderColorContext';
import logoAnimation from '../../public/logo-animation.json';
import { LoadingOverlay } from './LoadingOverlay';
import { useFetcher, NavLink } from 'react-router';
import type { FeaturedCollectionFragment } from 'storefrontapi.generated';
import type { HeroContent } from '~/lib/graphql/hero';

export function HeroSection({ hero }: { hero?: HeroContent }) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayInteractive, setOverlayInteractive] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { setHeaderVisible, isHeaderVisible } = useHeaderAnimation();
  const { setHeaderColor } = useHeaderColor();
  const overlayRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const keepRef = useRef<HTMLSpanElement>(null);
  const itRef = useRef<HTMLSpanElement>(null);
  const saltyRef = useRef<HTMLSpanElement>(null);
  const exploreBtnRef = useRef<HTMLAnchorElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Fetch S25 collection data
  const s25Fetcher = useFetcher<FeaturedCollectionFragment>();
  const [s25Collection, setS25Collection] = useState<FeaturedCollectionFragment | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    
    // Initial check
    handleMediaChange(mql);
    
    // Use the appropriate listener method
    if (mql.addEventListener) {
      mql.addEventListener('change', handleMediaChange);
    } else {
      // Fallback for older browsers
      mql.addListener(handleMediaChange);
    }
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMediaChange);
      } else {
        mql.removeListener(handleMediaChange);
      }
    };
  }, []);

  useEffect(() => {
    // Fetch S25 collection data when component mounts
    if (s25Fetcher.state === 'idle' && !s25Fetcher.data) {
      s25Fetcher.load('/api/s25collection');
    }
  }, [s25Fetcher]);

  // Update s25Collection state when data is fetched
  useEffect(() => {
    if (s25Fetcher.data) {
      setS25Collection(s25Fetcher.data);
    }
  }, [s25Fetcher.data]);

  // GSAP fade out when Lottie finishes
  const handleLottieComplete = useCallback(() => {
    setOverlayInteractive(false);
    let triggered = false;
    if (overlayRef.current) {
      // Use gsap.context for scoping and cleanup
      const ctx = gsap.context(() => {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          force3D: true,
          onUpdate() {
            if (!triggered && this.progress() >= 0.3) {
              setHeaderVisible(true);
              triggered = true;
            }
          },
          onComplete: () => {
            setOverlayVisible(false);
          },
        });
      }, overlayRef);
      return () => ctx.revert();
    }
  }, [setHeaderVisible]);

  useGSAP(() => {
    if (overlayRef.current) {
      gsap.set(overlayRef.current, { opacity: 1, force3D: true });
    }
  }, [overlayVisible]);

  // Intersection observer to set header color back to white when hero is in view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderColor(hero?.textColor || 'default');
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [setHeaderColor]);

  // GSAP animation for title text
  useGSAP(() => {
    if (!isHeaderVisible) return;

    // Use gsap.context for scoping and cleanup
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          duration: 0.8,
          ease: 'power3.out',
          force3D: true,
        }
      });

      // Prepare elements for animation
      gsap.set([keepRef.current, itRef.current, saltyRef.current, exploreBtnRef.current], {
        filter: 'blur(10px)',
        y: 20,
        opacity: 0,
        willChange: 'filter, transform, opacity',
      });

      tl.to(keepRef.current, {
        filter: 'blur(0px)', y: 0, opacity: 1,
      })
        .to(itRef.current, {
          filter: 'blur(0px)', y: 0, opacity: 1,
        }, '-=0.6')
        .to(saltyRef.current, {
          filter: 'blur(0px)', y: 0, opacity: 1,
        }, '-=0.6')
        .to(exploreBtnRef.current, {
          filter: 'blur(0px)', y: 0, opacity: 1,
        }, '-=0.8');
    }, [keepRef, itRef, saltyRef, exploreBtnRef]);
    return () => ctx.revert();
  }, [isHeaderVisible]);

  // (debug logs removed)

  return (
    <section
      ref={sectionRef}
      className="relative w-screen left-1/2 right-1/2 -mx-[50vw] overflow-hidden flex items-center justify-center"
      style={{
        // Use 'dvh' (dynamic viewport height) to account for mobile browser UI
        height: '93dvh',
      }}
    >
      {/* Overlay with Lottie animation */}
      <LoadingOverlay
        visible={overlayVisible}
        interactive={overlayInteractive}
        overlayRef={overlayRef}
        lottieRef={lottieRef}
        animationData={logoAnimation}
        onComplete={handleLottieComplete}
      />
      {/* Hero Content Wrapper - Clickable area */}
      <NavLink
        to={hero?.ctaCollectionHandle ? `/collections/${hero.ctaCollectionHandle}` : '/collections/s25-collection'}
        className="absolute inset-0 z-0 block cursor-pointer group focus:outline-none"
      >
        {/* Hero background video */}
        {(() => {
          const sources = isMobile ? hero?.mobileVideoSources : hero?.desktopVideoSources;
          const fallbackUrl = isMobile
            ? (hero?.mobileVideoUrl || '/hero-mobile.mp4')
            : (hero?.desktopVideoUrl || hero?.mobileVideoUrl || '/hero.mp4');

          const hasSources = !!(sources && sources.length > 0);

          return (
            <video
              key={isMobile ? 'mobile-video' : 'desktop-video'}
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full object-cover z-0"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              poster="/hero-placeholder.png"
              onCanPlay={() => setIsVideoLoaded(true)}
              style={{ willChange: 'opacity, filter' }}
              src={hasSources ? undefined : fallbackUrl}
            >
              {hasSources && sources.map((s, idx) => (
                <source key={`${s.url}-${idx}`} src={s.url} type={s.mimeType || undefined} />
              ))}
            </video>
          );
        })()}

        <div className="absolute top-5 left-0 w-full h-full flex items-start pt-[var(--header-height)] pl-4 z-[1]">
          <h1 
            className='font-normal text-4xl sm:text-5xl md:text-5xl tracking-tight max-w-[80%] sm:max-w-[60%] md:max-w-[100%] text-left overflow-hidden leading-[0.9]'
            style={{ color: hero?.textColor || 'white' }}
          >
            <span ref={keepRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>{hero?.headline?.split(' ')[0] || 'KEEP'}</span>{' '}
            <span ref={itRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>{hero?.headline?.split(' ')[1] || 'IT'}</span>{' '}
            <span ref={saltyRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>{hero?.headline?.split(' ').slice(2).join(' ') || 'SALTY.'}</span>
          </h1>
        </div>
      </NavLink>

      {/* S25 Collection button container - removed as per request */}
      {/* SHOP HERE link at bottom right */}
      <NavLink
        to={hero?.ctaCollectionHandle ? `/collections/${hero.ctaCollectionHandle}` : '/collections/s25-collection'}
        className="absolute bottom-8 right-8 z-[8] text-md tracking-widest font-medium uppercase hover:underline focus:underline outline-none"
        style={{ color: hero?.textColor || 'white' }}
        ref={exploreBtnRef}
      >
        {(hero?.ctaText || 'SHOP HERE').toUpperCase()}
      </NavLink>
    </section>
  );
}
