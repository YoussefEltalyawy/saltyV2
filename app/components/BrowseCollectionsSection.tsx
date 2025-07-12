import React, { useEffect, useState } from 'react';

export function BrowseCollectionsSection() {
  const [dynamicTopMargin, setDynamicTopMargin] = useState('-3rem');

  // Calculate responsive top margin based on multiple factors
  useEffect(() => {
    const calculateResponsiveTopMargin = () => {
      const viewportHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      const documentHeight = document.documentElement.clientHeight;
      const windowWidth = window.innerWidth;

      // Calculate the ratio of available viewport vs screen height
      const viewportRatio = viewportHeight / screenHeight;
      const isLandscape = windowWidth > viewportHeight;

      // Detect browser/app type for specific adjustments
      const userAgent = navigator.userAgent.toLowerCase();
      const isInAppBrowser = /gsa\/|fban\/|fbav\/|twitter|instagram|linkedin|wechat|line|whatsapp/i.test(userAgent);
      const isSafari = /safari/i.test(userAgent) && !/chrome|crios|fxios|edgios/i.test(userAgent);
      const isChrome = /chrome|crios/i.test(userAgent);
      const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent);

      // Base calculation using CSS custom properties approach
      // This ensures we account for actual available space
      let baseMargin = 0;

      if (isMobile) {
        // For mobile devices, calculate based on available space
        if (isInAppBrowser) {
          // In-app browsers often have less available space
          if (viewportRatio < 0.75) {
            baseMargin = viewportHeight * 0.05; // 5% of available height
          } else {
            baseMargin = viewportHeight * 0.08; // 8% of available height
          }
        } else if (isSafari) {
          // Safari has its own behavior
          if (viewportRatio < 0.8) {
            baseMargin = viewportHeight * 0.06; // 6% of available height
          } else {
            baseMargin = viewportHeight * 0.09; // 9% of available height
          }
        } else {
          // Chrome and other browsers
          baseMargin = viewportHeight * 0.07; // 7% of available height
        }

        // Adjust for landscape mode
        if (isLandscape) {
          baseMargin *= 0.6; // Reduce in landscape
        }
      } else {
        // Desktop calculation
        baseMargin = Math.min(viewportHeight * 0.08, 80); // Max 80px
      }

      // Convert to negative margin for the peek effect
      const finalMargin = -Math.max(baseMargin, 30); // Minimum 30px peek

      return `${finalMargin}px`;
    };

    // Set initial margin
    setDynamicTopMargin(calculateResponsiveTopMargin());

    // Update on resize and orientation change
    const handleResize = () => {
      // Small delay to ensure UI changes are complete
      setTimeout(() => {
        setDynamicTopMargin(calculateResponsiveTopMargin());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Also listen for viewport changes that might not trigger resize
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          setDynamicTopMargin(calculateResponsiveTopMargin());
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleResize);
    };
  }, []);

  return (
    <section
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6 relative"
      style={{
        minHeight: 'max(48vh, 300px)', // Ensure minimum height
        marginTop: dynamicTopMargin,
        zIndex: 2,
        // Use CSS custom properties for additional responsiveness
        '--section-peek': 'clamp(30px, 8vh, 100px)',
      } as React.CSSProperties}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>


    </section>
  );
}