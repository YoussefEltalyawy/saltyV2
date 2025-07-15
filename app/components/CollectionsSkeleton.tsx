import React from 'react';

const CollectionsSkeleton = () => (
  <div className="flex flex-col gap-2 mt-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-6 bg-gray-800 animate-pulse rounded w-24"></div>
    ))}
  </div>
);

export default CollectionsSkeleton; 