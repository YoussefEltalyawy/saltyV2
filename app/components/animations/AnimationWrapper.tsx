import { useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { useIsomorphicLayoutEffect } from 'framer-motion';

type AnimationProps = {
  children: ReactNode;
  delay?: number;
  from?: 'top' | 'bottom' | 'left' | 'right';
  duration?: number;
  className?: string;
};

export function AnimationWrapper({
  children,
  delay = 0,
  from = 'bottom',
  duration = 0.8,
  className = '',
}: AnimationProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion) return;

    const element = elementRef.current;
    if (!element) return;

    // Set initial position based on direction
    const direction = {
      top: { y: -50 },
      bottom: { y: 30 },
      left: { x: -50 },
      right: { x: 50 },
    }[from];

    // Set initial styles
    gsap.set(element, {
      ...direction,
      opacity: 0,
      willChange: 'transform, opacity',
    });

    // Animate in
    const tl = gsap.timeline({
      delay,
      onComplete: () => {
        // Clean up will-change for better performance after animation
        gsap.set(element, { willChange: 'auto' });
      },
    });

    tl.to(element, {
      ...{ x: 0, y: 0 },
      opacity: 1,
      duration,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
    };
  }, [delay, duration, from, prefersReducedMotion]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
