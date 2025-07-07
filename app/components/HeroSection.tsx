import { useEffect, useState, useRef } from 'react';

export function HeroSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw] h-screen overflow-hidden flex items-center justify-center">
      {!isVideoLoaded && (
        <img
          src="/hero-placeholder.png"
          alt="Loading..."
          className="absolute top-0 left-0 w-screen min-w-screen h-screen min-h-screen object-cover z-0"
        />
      )}
      <video
        ref={videoRef}
        className={`absolute top-0 left-0 w-screen min-w-screen h-screen min-h-screen object-cover z-0 ${!isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
        src="/hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={() => setIsVideoLoaded(true)}
      />
      <div className="absolute top-5 left-0 w-full h-full flex items-start pt-[var(--header-height)] pl-4 z-1">
        <h1 className='text-white font-normal text-6xl md:text-7xl tracking-tight max-w-[65%] text-left'>
          KEEP IT SALTY.
        </h1>
      </div>
    </section>
  );
}
