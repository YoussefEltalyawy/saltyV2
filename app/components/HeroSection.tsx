import { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import logoAnimation from '../../public/logo-animation.json';
import { LoadingOverlay } from './LoadingOverlay';
import { useFetcher } from 'react-router';
import type { FeaturedCollectionFragment } from 'storefrontapi.generated';

const LOGO_ANIMATION = '/logo-animation.json';

export function HeroSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayInteractive, setOverlayInteractive] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const { setHeaderVisible, isHeaderVisible } = useHeaderAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const keepRef = useRef<HTMLSpanElement>(null);
  const itRef = useRef<HTMLSpanElement>(null);
  const saltyRef = useRef<HTMLSpanElement>(null);
  const exploreBtnRef = useRef<HTMLAnchorElement>(null); // Add ref for Explore button

  // Fetch S25 collection data
  const s25Fetcher = useFetcher<FeaturedCollectionFragment>();
  const [s25Collection, setS25Collection] = useState<FeaturedCollectionFragment | null>(null);

  // Detect viewport height and mobile browser UI
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    const detectMobile = () => {
      // Check if it's a mobile device
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    // Initial measurements
    updateViewportHeight();
    detectMobile();

    // Listen for resize events
    window.addEventListener('resize', () => {
      updateViewportHeight();
      detectMobile();
    });

    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure the orientation change is complete
      setTimeout(() => {
        updateViewportHeight();
        detectMobile();
      }, 100);
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);

    // Fetch S25 collection data when component mounts
    if (s25Fetcher.state === 'idle' && !s25Fetcher.data) {
      s25Fetcher.load('/api/s25collection');
    }
  }, []);

  // Update s25Collection state when data is fetched
  useEffect(() => {
    if (s25Fetcher.data) {
      setS25Collection(s25Fetcher.data);
    }
  }, [s25Fetcher.data]);

  // Calculate dynamic bottom margin based on viewport and device type
  const getDynamicBottomMargin = () => {
    if (viewportHeight === 0) return '2rem'; // Default fallback

    // For mobile devices, use larger margins to account for browser UI
    if (isMobile) {
      // For very small mobile devices (iPhone SE, etc.)
      if (viewportHeight < 700) {
        return '5rem';
      }

      // For standard mobile devices
      if (viewportHeight < 800) {
        return '4rem';
      }

      // For larger mobile devices
      return '3rem';
    }

    // For desktop devices
    if (viewportHeight < 1024) {
      return '3rem';
    }

    // For larger screens, use standard margin
    return '2rem';
  };

  // GSAP slide up when Lottie finishes
  const handleLottieComplete = useCallback(() => {
    setOverlayInteractive(false);
    let triggered = false;
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        y: '100%',
        duration: 0.8,
        ease: 'power3.out',
        onUpdate: function () {
          if (!triggered && this.progress() >= 0.3) { // now 0.4 for 40%
            setHeaderVisible(true);
            triggered = true;
          }
        },
        onComplete: () => {
          setOverlayVisible(false);
        },
      });
    }
  }, [setHeaderVisible]);

  useGSAP(() => {
    if (overlayRef.current) {
      gsap.set(overlayRef.current, { y: 0 });
    }
  }, [overlayVisible]);

  // GSAP animation for title text - word by word with slide up + blur
  useGSAP(() => {
    // Always set initial state first
    gsap.set([keepRef.current, itRef.current, saltyRef.current], {
      filter: 'blur(10px)',
      y: 30, // Start below the final position for slide-up effect
      opacity: 0,
    });
    gsap.set(exploreBtnRef.current, {
      filter: 'blur(10px)',
      y: 30,
      opacity: 0,
    });

    if (isHeaderVisible) {
      // Animate words in sequence: KEEP -> IT -> SALTY
      gsap.to(keepRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
      });

      gsap.to(itRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.3, // Start after "KEEP" animation
      });

      gsap.to(saltyRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6, // Start after "IT" animation
      });

      // Animate Explore button after SALTY starts (same as delay for SALTY: 0.6s)
      gsap.to(exploreBtnRef.current, {
        filter: 'blur(0px)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6,
      });
    }
  }, [isHeaderVisible]);

  return (
    <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] h-screen overflow-hidden flex items-center justify-center">
      {/* Overlay with Lottie animation */}
      <LoadingOverlay
        visible={overlayVisible}
        interactive={overlayInteractive}
        overlayRef={overlayRef}
        lottieRef={lottieRef}
        animationData={logoAnimation}
        onComplete={handleLottieComplete}
      />
      {/* Hero background with native poster support */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-screen min-w-screen h-screen min-h-screen object-cover z-0"
        src="/hero.mp4"
        poster="/hero-placeholder.png"
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={() => setIsVideoLoaded(true)}
      />
      <div className="absolute top-5 left-0 w-full h-full flex items-start pt-[var(--header-height)] pl-4 z-1">
        <h1 className='text-white font-normal text-6xl md:text-7xl tracking-tight max-w-[65%] text-left overflow-hidden'>
          <span ref={keepRef} className="inline-block">KEEP</span>{' '}
          <span ref={itRef} className="inline-block">IT</span>{' '}
          <span ref={saltyRef} className="inline-block">SALTY.</span>
        </h1>
      </div>
      {/* Add S25 Collection button at the bottom of hero */}
      <div
        className="absolute left-0 w-full flex justify- z-1 pointer-events-none"
        style={{ bottom: getDynamicBottomMargin() }}
      >
        <a
          ref={exploreBtnRef} // Add ref here
          href="/collections/s25-collection"
          className="flex items-center justify-between w-[90vw] max-w-md mx-auto shadow-lg py-2.5 px-6 text-xl font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white pointer-events-auto rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
            position: 'relative',
          }}
        >
          {/* Background image from collection */}
          {s25Collection?.image && (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${s25Collection.image.url})`,
                filter: 'brightness(0.5)',
                backgroundPosition: 'top 30% center', // Move image further down
              }}
            />
          )}
          <span className="text-center text-xl relative  text-white font-manrope font-normal">Explore S25 Collection</span>
          <span className="ml-4 flex items-center justify-center w-8 h-8 rounded-full relative  backdrop-blur-sm bg-white/10 border border-white/40 shadow-inner">
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </a>
      </div>
    </section>
  );
}