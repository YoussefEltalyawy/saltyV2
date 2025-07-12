import React, { useEffect, useState } from 'react';

export function BrowseCollectionsSection() {
  return (
    <section
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6 relative"
      style={{
        minHeight: 'max(48vh, 300px)',
        marginTop: 'calc(-1 * var(--section-peek, clamp(30px, 8vh, 100px)))',
        zIndex: 2,
        '--section-peek': 'clamp(30px, 8vh, 100px)',
      } as React.CSSProperties}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>
    </section>
  );
}