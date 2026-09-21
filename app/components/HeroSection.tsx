import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import { useHeaderColorSection } from '~/components/HeaderColorContext';
import logoAnimation from '../../public/logo-animation.json';
import { LoadingOverlay } from './LoadingOverlay';
import { useFetcher, NavLink } from 'react-router';
import type { FeaturedCollectionFragment } from 'storefrontapi.generated';
import type { HeroContent, HeroSlideContent } from '~/lib/graphql/hero';

function HeroSlideItem({
  slide,
  isActive,
  isPrevious,
  shouldLoad,
  isHeaderVisible,
  isMobile,
  isSwipingRef
}: {
  slide: HeroSlideContent,
  isActive: boolean,
  isPrevious: boolean,
  shouldLoad: boolean,
  isHeaderVisible: boolean,
  isMobile: boolean,
  isSwipingRef: React.RefObject<boolean>
}) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const exploreBtnRef = useRef<HTMLAnchorElement>(null);

  // The headline from Shopify — split into individual words for animation
  const headlineWords = slide?.headline?.trim().split(/\s+/).filter(Boolean) || [];

  // Handle cached images that might not fire onLoad
  const imageUrl = isMobile 
    ? (slide?.mobileImageUrl || slide?.desktopImageUrl)
    : (slide?.desktopImageUrl || slide?.mobileImageUrl);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setIsImageLoaded(true);
    }
  }, [imageUrl, isActive]);

  // Handle video ready check
  useEffect(() => {
    const checkVideo = () => {
      if (videoRef.current && videoRef.current.readyState >= 3) {
        setIsVideoLoaded(true);
      }
    };
    checkVideo();
    const interval = setInterval(checkVideo, 500);
    const timer = setTimeout(() => clearInterval(interval), 5000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  // Perf: only the active slide's video plays. Inactive videos pause and
  // release the decoder so N slides don't decode simultaneously (the lag source).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play?.().catch(() => {});
    } else {
      video.pause?.();
    }
  }, [isActive]);

  // GSAP animation for text when slide becomes active
  useGSAP(() => {
    if (!isHeaderVisible || !isActive) return;
    if (!headlineRef.current) return;

    const wordSpans = headlineRef.current.querySelectorAll('span');

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out', force3D: true } });

      gsap.set([...wordSpans, exploreBtnRef.current], {
        filter: 'blur(10px)',
        y: 20,
        opacity: 0,
        willChange: 'filter, transform, opacity',
      });

      tl.to([...wordSpans], {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        stagger: 0.08,
      }).to(exploreBtnRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
      }, '-=0.5');
    });
    
    return () => ctx.revert();
  }, [isHeaderVisible, isActive]);

  const ctaLink = slide?.ctaCollectionHandle ? `/collections/${slide.ctaCollectionHandle}` : '/collections/s25-collection';
  const textColor = slide?.textColor || 'white';

  return (
    <div 
      className={`absolute inset-0 ${
        isActive 
          ? 'opacity-100 z-10 transition-opacity duration-1000 pointer-events-auto' 
          : isPrevious
            ? 'opacity-100 z-[5] pointer-events-none'
            : 'opacity-0 z-0 transition-opacity duration-1000 pointer-events-none'
      }`}
    >
      <NavLink
        to={ctaLink}
        className="absolute inset-0 z-0 block cursor-pointer focus:outline-none"
        onClick={(e) => {
          if (isSwipingRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {imageUrl ? (
          <>
            <img
              src="/hero-placeholder.png"
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${isImageLoaded ? 'opacity-0' : 'opacity-100'}`}
            />
            {shouldLoad ? (
              <img
                ref={imageRef}
                src={imageUrl}
                alt=""
                onLoad={() => setIsImageLoaded(true)}
                loading={isActive ? 'eager' : 'lazy'}
                decoding="async"
                // @ts-expect-error - fetchPriority is valid in modern browsers
                fetchpriority={isActive ? 'high' : 'low'}
                className={`absolute top-0 left-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
              />
            ) : null}
          </>
        ) : shouldLoad ? (() => {
          const sources = isMobile ? slide?.mobileVideoSources : slide?.desktopVideoSources;
          const fallbackUrl = isMobile
            ? (slide?.mobileVideoUrl || '/hero-mobile.mp4')
            : (slide?.desktopVideoUrl || slide?.mobileVideoUrl || '/hero.mp4');
          const hasSources = !!(sources && sources.length > 0);
          return (
            <>
              <img 
                src="/hero-placeholder.png"
                alt=""
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
              />
              <video
                key={isMobile ? 'mobile-video' : 'desktop-video'}
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
                autoPlay={isActive}
                loop
                muted
                playsInline
                preload={isActive || isPrevious ? 'auto' : 'metadata'}
                crossOrigin="anonymous"
                onCanPlay={() => setIsVideoLoaded(true)}
                onPlaying={() => setIsVideoLoaded(true)}
                onLoadedData={() => setIsVideoLoaded(true)}
                onError={() => setIsVideoLoaded(false)}
                style={{ opacity: isVideoLoaded ? 1 : 0.01 }}
                src={hasSources ? undefined : fallbackUrl}
              >
                {hasSources && sources!.map((s, idx) => (
                  <source key={`${s.url}-${idx}`} src={s.url} type={s.mimeType || undefined} />
                ))}
              </video>
            </>
          );
        })() : (
          <img
            src="/hero-placeholder.png"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}

        {/* Headline */}
        <div className="absolute top-0 left-0 w-full h-full flex items-start pt-[calc(var(--header-height)+1.25rem)] pl-4 z-[1] pointer-events-none">
          <h1
            ref={headlineRef}
            className="font-normal text-4xl sm:text-5xl md:text-5xl tracking-tight text-left leading-[0.95] max-w-[85%]"
            style={{ color: textColor }}
          >
            {headlineWords.map((word, i) => (
              <span
                key={i}
                className="inline-block mr-[0.25em]"
                style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)', willChange: 'filter, transform, opacity' }}
              >
                {word}
              </span>
            ))}
          </h1>
        </div>
      </NavLink>

      {/* CTA Button — outside the NavLink to avoid nested <a> */}
      <NavLink
        to={ctaLink}
        className="absolute bottom-12 right-8 z-[8] text-md tracking-widest font-medium uppercase underline hover:opacity-70 focus:outline-none transition-opacity duration-300"
        style={{ color: textColor, opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}
        ref={exploreBtnRef}
        onClick={(e) => {
          if (isSwipingRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {(slide?.ctaText || 'SHOP HERE').toUpperCase()}
      </NavLink>
    </div>
  );
}

// Arrow icon component
function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {direction === 'left'
        ? <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      }
    </svg>
  );
}

export function HeroSection({ hero }: { hero?: HeroContent }) {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayInteractive, setOverlayInteractive] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [previousSlideIndex, setPreviousSlideIndex] = useState(0);
  const { setHeaderVisible, isHeaderVisible } = useHeaderAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Touch & Swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const slides = useMemo(() => {
    if (hero?.slides?.length) return hero.slides;
    if (hero) return [hero];
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero]);
  const s25Fetcher = useFetcher<FeaturedCollectionFragment>();

  // Stable slide color for header — memoized so the scroll-spy hook
  // doesn't re-subscribe every render (that was a flicker + jank source).
  const activeSlideColor = useMemo(
    () => slides[currentSlideIndex]?.textColor || 'default',
    [slides, currentSlideIndex],
  );

  // Single-winner scroll-spy: hero owns the header color only while it
  // occupies the viewport middle. No fighting with sections below.
  useHeaderColorSection(sectionRef, activeSlideColor as any);

  const goToSlide = useCallback((idx: number) => {
    setCurrentSlideIndex(prev => {
      setPreviousSlideIndex(prev);
      return idx;
    });
  }, []);

  const goPrev = useCallback(() => {
    goToSlide((currentSlideIndex - 1 + slides.length) % slides.length);
  }, [currentSlideIndex, slides.length, goToSlide]);

  const goNext = useCallback(() => {
    goToSlide((currentSlideIndex + 1) % slides.length);
  }, [currentSlideIndex, slides.length, goToSlide]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handleMediaChange(mql);
    if (mql.addEventListener) mql.addEventListener('change', handleMediaChange);
    else mql.addListener(handleMediaChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handleMediaChange);
      else mql.removeListener(handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (s25Fetcher.state === 'idle' && !s25Fetcher.data) {
      s25Fetcher.load('/api/s25collection');
    }
  }, [s25Fetcher]);

  // Auto-slide logic — reset timer on manual navigation
  useEffect(() => {
    if (slides.length <= 1 || overlayVisible) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => {
        setPreviousSlideIndex(prev);
        return (prev + 1) % slides.length;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length, overlayVisible, currentSlideIndex]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    const dx = touchEndX.current - touchStartX.current;
    const dy = touchEndY.current - touchStartY.current;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchEndX.current - touchStartX.current;
    const dy = (touchEndY.current ?? 0) - (touchStartY.current ?? 0);

    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 150);
  }, [goNext, goPrev]);

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    isSwipingRef.current = false;
  }, []);

  // Pointer event handlers for mouse drag swiping on desktop
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    touchEndX.current = e.clientX;
    touchEndY.current = e.clientY;
    isSwipingRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || touchStartX.current === null || touchStartY.current === null) return;
    touchEndX.current = e.clientX;
    touchEndY.current = e.clientY;
    const dx = touchEndX.current - touchStartX.current;
    const dy = touchEndY.current - touchStartY.current;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      if (!isSwipingRef.current) {
        isSwipingRef.current = true;
        if (e.currentTarget.hasPointerCapture && !e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (touchStartX.current === null || touchEndX.current === null) return;
    const dx = touchEndX.current - touchStartX.current;
    const dy = (touchEndY.current ?? 0) - (touchStartY.current ?? 0);
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 150);
  }, [goNext, goPrev]);

  const handleLottieComplete = useCallback(() => {
    setOverlayInteractive(false);
    let triggered = false;
    if (overlayRef.current) {
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
          onComplete: () => setOverlayVisible(false),
        });
      }, overlayRef);
      return () => ctx.revert();
    }
  }, [setHeaderVisible]);

  useGSAP(() => {
    if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 1, force3D: true });
  }, [overlayVisible]);

  // Single-winner scroll-spy owns the header color (see hook above).
  // Slide changes while hero is active are pushed via the hook's color dep.

  const currentTextColor = activeSlideColor === 'default' ? 'white' : activeSlideColor;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section
      ref={sectionRef}
      className="relative w-screen left-1/2 right-1/2 -mx-[50vw] overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      style={{ height: '93dvh', touchAction: 'pan-y' }}
      onDragStart={(e) => e.preventDefault()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <LoadingOverlay
        visible={overlayVisible}
        interactive={overlayInteractive}
        overlayRef={overlayRef}
        lottieRef={lottieRef}
        animationData={logoAnimation}
        onComplete={handleLottieComplete}
      />
      
      {slides.map((slide, index) => {
        const isActive = index === currentSlideIndex;
        const isPrevious = index === previousSlideIndex && index !== currentSlideIndex;
        // Only active + immediate neighbours mount heavy media. Others keep
        // the lightweight placeholder so N videos/images never decode at once.
        const nextIndex = (currentSlideIndex + 1) % slides.length;
        const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
        const shouldLoad = isActive || isPrevious || index === nextIndex || index === prevIndex;
        return (
          <HeroSlideItem
            key={index}
            slide={slide}
            isActive={isActive}
            isPrevious={isPrevious}
            shouldLoad={shouldLoad}
            isHeaderVisible={isHeaderVisible}
            isMobile={isMobile}
            isSwipingRef={isSwipingRef}
          />
        );
      })}

      {/* Uncluttered bottom bar: slide counter left, full-width segmented progress bars bottom */}
      {slides.length > 1 && (
        <>
          {/* Slide counter bottom-left */}
          <div className="absolute bottom-5 left-6 z-20 pointer-events-none">
            <span
              className="text-[11px] font-mono tracking-[0.25em] tabular-nums pointer-events-auto uppercase"
              style={{ color: currentTextColor, opacity: 0.75 }}
            >
              {pad(currentSlideIndex + 1)}&nbsp;/&nbsp;{pad(slides.length)}
            </span>
          </div>

          {/* Sleek progress lines at very bottom edge */}
          <div className="absolute bottom-0 left-0 w-full flex z-20 gap-1 px-1">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { if (idx !== currentSlideIndex) goToSlide(idx); }}
                className="flex-1 h-[2px] cursor-pointer focus:outline-none group/bar py-2 flex items-end"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <div 
                  className={`w-full h-[2px] transition-all duration-500 rounded-full ${
                    idx === currentSlideIndex ? 'bg-white opacity-100' : 'bg-white/30 group-hover/bar:bg-white/60'
                  }`} 
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}


