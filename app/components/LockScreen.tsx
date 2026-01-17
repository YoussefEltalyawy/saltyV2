import React, { useState } from 'react';
import { safeLocalStorage } from '~/lib/localStorage';

interface LockScreenProps {
  correctPassword: string;
  onPasswordSuccess: () => void;
  backgroundImageUrl?: string | null;
  title?: string | null;
  description?: string | null;
}

export function LockScreen({
  correctPassword,
  onPasswordSuccess,
  backgroundImageUrl,
  title,
  description
}: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      safeLocalStorage.setItem('storeAccessGranted', 'true');
      onPasswordSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  // Fallback values
  const displayTitle = title || 'Store Access Required';
  const displayDescription = description || 'If you\'re a Salty Club Member You\'ll have the password to join!';

  // Build background style with all necessary properties
  const backgroundStyle = backgroundImageUrl
    ? {
      backgroundImage: `url('${backgroundImageUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000000', // Fallback black background
    }
    : {};

  const containerClass = backgroundImageUrl
    ? 'fixed inset-0 flex items-center justify-center z-50'
    : 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50';

  return (
    <div
      className={containerClass}
      style={backgroundStyle}
    >
      {backgroundImageUrl && (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        ></div>
      )}
      <div className="relative bg-white p-8 rounded-lg shadow-lg max-w-md w-full z-10">
        <h2 className="text-2xl font-bold mb-6 text-center">{displayTitle}</h2>
        <p className="text-gray-600 mb-6 text-center">
          {displayDescription}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-[#beb1a1] text-black py-2 px-4 rounded-md hover:bg-brandBeige/80 transition duration-200"
          >
            Enter Store
          </button>
        </form>
      </div>
    </div>
  );
}