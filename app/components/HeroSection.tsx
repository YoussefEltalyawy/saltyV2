import { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import logoAnimation from '../../public/logo-animation.json';
import { LoadingOverlay } from './LoadingOverlay';
import { useFetcher, NavLink } from 'react-router';
import type { FeaturedCollectionFragment } from 'storefrontapi.generated';

export function HeroSection() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayInteractive, setOverlayInteractive] = useState(true);
  const { setHeaderVisible, isHeaderVisible } = useHeaderAnimation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const keepRef = useRef<HTMLSpanElement>(null);
  const itRef = useRef<HTMLSpanElement>(null);
  const saltyRef = useRef<HTMLSpanElement>(null);
  const exploreBtnRef = useRef<HTMLAnchorElement>(null);

  // Fetch S25 collection data
  const s25Fetcher = useFetcher<FeaturedCollectionFragment>();
  const [s25Collection, setS25Collection] = useState<FeaturedCollectionFragment | null>(null);

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
          onUpdate: function () {
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

  // GSAP animation for title text
  useGSAP(() => {
    gsap.set([keepRef.current, itRef.current, saltyRef.current, exploreBtnRef.current], {
      filter: 'blur(10px)',
      y: 30,
      opacity: 0,
      willChange: 'filter, transform, opacity',
      force3D: true,
    });

    if (isHeaderVisible) {
      // Use gsap.context for scoping and cleanup
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.to(keepRef.current, {
          filter: 'blur(0px)', y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', willChange: 'filter, transform, opacity', force3D: true,
        })
          .to(itRef.current, {
            filter: 'blur(0px)', y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', willChange: 'filter, transform, opacity', force3D: true,
          }, '-=0.5')
          .to(saltyRef.current, {
            filter: 'blur(0px)', y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', willChange: 'filter, transform, opacity', force3D: true,
          }, '-=0.5')
          .to(exploreBtnRef.current, {
            filter: 'blur(0px)', y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', willChange: 'filter, transform, opacity', force3D: true,
          }, '-=0.8');
      }, [keepRef, itRef, saltyRef, exploreBtnRef]);
      return () => ctx.revert();
    }
  }, [isHeaderVisible]);

  return (
    <section
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
      {/* Hero background video */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        src="/hero.mp4"
        poster="/hero-placeholder.png"
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={() => setIsVideoLoaded(true)}
        style={{ willChange: 'opacity, filter' }}
      />
      <div className="absolute top-5 left-0 w-full h-full flex items-start pt-[var(--header-height)] pl-4 z-1">
        <h1 className='text-white font-normal text-3xl md:text-3xl tracking-tight max-w-[40%] text-left overflow-hidden'>
          <span ref={keepRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>KEEP</span>{' '}
          <span ref={itRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>IT</span>{' '}
          <span ref={saltyRef} className="inline-block" style={{ willChange: 'filter, transform, opacity' }}>SALTY.</span>
        </h1>
      </div>
      {/* S25 Collection button container - removed as per request */}
      {/* SHOP HERE link at bottom right */}
      <NavLink
        to="/collections/s25-collection"
        className="absolute bottom-8 right-8 z- text-white text-sm tracking-widest font-medium uppercase hover:underline focus:underline outline-none"

      >
        SHOP HERE
      </NavLink>
    </section>
  );
}
