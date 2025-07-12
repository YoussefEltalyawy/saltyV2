import React, { useEffect, useState } from 'react';

export function BrowseCollectionsSection() {
  const [staticTopMargin, setStaticTopMargin] = useState('-2rem');

  // Calculate static top margin once on mount to match hero button positioning
  useEffect(() => {
    const calculateStaticTopMargin = () => {
      const viewportHeight = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const isMobile = isMobileDevice || isSmallScreen;

      // These margins should create a bigger peek under the button - more negative = more visible
      // Special case for very short viewports (e.g., iOS Safari with bottom bar)
      if (viewportHeight < 650) {
        return '-12rem'; // Show much more of the section
      }

      if (isMobile) {
        // For very small mobile devices (iPhone SE, etc.)
        if (viewportHeight < 700) {
          return '-6rem';
        }
        // For standard mobile devices
        if (viewportHeight < 800) {
          return '-5rem';
        }
        // For larger mobile devices
        return '-4rem';
      }

      // For desktop devices
      if (viewportHeight < 1024) {
        return '-3.5rem';
      }

      // For larger screens
      return '-3rem';
    };

    // Set the static margin only once
    setStaticTopMargin(calculateStaticTopMargin());
  }, []); // Empty dependency array - only run once on mount

  return (
    <section
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6 relative"
      style={{
        minHeight: '48vh',
        marginTop: staticTopMargin, // Use calculated static margin
        zIndex: 2,
      }}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>

   
    </section>
  );
}