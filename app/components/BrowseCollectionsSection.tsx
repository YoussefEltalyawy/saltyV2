import React from 'react';

export function BrowseCollectionsSection() {
  return (
    <section
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6 relative"
      style={{
        minHeight: 'max(48vh, 300px)',
        // Use negative margin with the CSS variable to pull the section up, creating the "peek"
        marginTop: 'calc(-1 * var(--section-peek))',
        // Add padding to the bottom to account for the safe area, ensuring content isn't hidden
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 2,
      } as React.CSSProperties}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>
      {/* You can add the rest of your collection content here */}
    </section>
  );
}
