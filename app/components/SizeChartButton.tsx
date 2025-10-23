import { useState } from 'react';

interface SizeChartButtonProps {
  sizeChartImage?: {
    url: string;
    altText?: string | null;
    width: number;
    height: number;
  } | null;
}

export function SizeChartButton({ sizeChartImage }: SizeChartButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if no size chart image
  if (!sizeChartImage?.url) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-black underline underline-offset-4 hover:text-gray-600 transition-colors"
      >
        Size Chart
      </button>

      {/* Popup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close size chart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Size chart image */}
            <div className="p-4">
              <img
                src={sizeChartImage.url}
                alt={sizeChartImage.altText || 'Size Chart'}
                className="max-w-full h-auto"
                style={{
                  maxHeight: '80vh',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
