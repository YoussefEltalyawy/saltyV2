import { useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import gsap from 'gsap';

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationComplete = useRef(false);

  useEffect(() => {
    if (animationComplete.current) return;

    // Set initial styles
    gsap.set(containerRef.current, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
      zIndex: 9999,
      opacity: 1,
    });

    // Anate out after a delay (adjust timing based on your Lottie animation)
    const timer = setTimeout(() => {
      animationComplete.current = true;
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          onComplete();
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.display = 'none';
            }
          }, 1000);
        },
      });
    }, 3000); // Adjust timing based on your Lottie animation

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div ref={containerRef}>
      <Lottie
        animationData={require('../../public/logo-animation.json')}
        loop={false}
        style={{
          width: 200,
          height: 200,
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}
