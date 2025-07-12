import React from 'react';

export function BrowseCollectionsSection() {
  return (
    <section
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6"
      style={{
        minHeight: '48vh', // Even more visible
        marginTop: '-3.5rem', // More negative margin to pull up further
        zIndex: 2,
        position: 'relative',
      }}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>
    </section>
  );
} 