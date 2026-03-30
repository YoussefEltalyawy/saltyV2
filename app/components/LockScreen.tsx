import React, { useState } from 'react';
import { useFetcher } from 'react-router';
import { safeLocalStorage } from '~/lib/localStorage';
import { CountdownTimer } from './CountdownTimer';

interface LockScreenProps {
  correctPassword: string;
  onPasswordSuccess: () => void;
  backgroundImageUrl?: string | null;
  title?: string | null;
  description?: string | null;
  dropDate?: string | null;
}

export function LockScreen({
  correctPassword,
  onPasswordSuccess,
  backgroundImageUrl,
  title,
  description,
  dropDate
}: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const fetcher = useFetcher();
  const actionData = fetcher.data as { success?: boolean; error?: string; message?: string } | undefined;
  const isSubmitting = fetcher.state === 'submitting';
  const isSubmitted = actionData?.success || false;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      // safeLocalStorage is accessed dynamically to prevent SSR issues
      safeLocalStorage.setItem('storeAccessGranted', 'true');
      onPasswordSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const backgroundStyle = backgroundImageUrl
    ? {
      backgroundImage: `url('${backgroundImageUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000000',
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
      {dropDate && (
        <div className="absolute top-0 left-0 right-0 z-20 w-full">
          <div className="flex justify-center w-full bg-white/5 backdrop-blur-md py-3 text-white border-b border-white/10 shadow-sm">
            <CountdownTimer targetDate={dropDate} />
          </div>
        </div>
      )}
      
      <div className="relative p-8 sm:px-12 max-w-[600px] w-[90%] z-10 my-8 text-white">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 text-center uppercase tracking-tight text-white drop-shadow-lg">
          Exclusive access only
        </h2>
        <div className="text-center mb-8">
          <p className="font-bold text-sm sm:text-base tracking-widest text-[#beb1a1] mb-2 uppercase drop-shadow-md">EARLY ACCESS</p>
          <p className="text-xs sm:text-sm text-gray-200 uppercase tracking-widest drop-shadow-md">
            ENTER YOUR email TO RECIEVE THE PASSWORD BEFORE THE DROP.
          </p>
        </div>

        {!showPasswordInput ? (
          <>
            {isSubmitted ? (
               <div className="text-center mb-6 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                 <p className="text-white font-medium drop-shadow-sm">Thank you for subscribing!</p>
                 <p className="text-gray-200 text-sm mt-1">Keep an eye on your inbox for the password.</p>
               </div>
            ) : (
              <fetcher.Form method="post" action="/api/newsletter-subscribe" className="space-y-4 mb-6">
                <div>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#beb1a1] focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#beb1a1] focus:border-transparent transition-all"
                    required
                  />
                  {actionData?.error && <p className="mt-2 text-sm text-red-400">{actionData.error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !name}
                  className="w-full bg-[#beb1a1] text-black font-semibold py-3 px-6 rounded-lg hover:bg-white transition duration-200 uppercase tracking-widest text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Subscribing...' : 'Submit'}
                </button>
              </fetcher.Form>
            )}

            <div className="text-center border-t border-white/20 pt-6">
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                className="text-sm text-gray-300 hover:text-white underline transition-colors"
              >
                ENTER THE PASSWORD
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 text-center tracking-widest bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#beb1a1] focus:border-transparent transition-all"
                  required
                />
              </div>
              {error && <div className="text-red-400 text-sm text-center drop-shadow-sm">{error}</div>}
              <button
                type="submit"
                className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition duration-200 uppercase tracking-widest text-sm mt-2"
              >
                Enter Password
              </button>
            </form>
            
            <div className="text-center border-t border-white/20 pt-6">
              <button
                type="button"
                onClick={() => setShowPasswordInput(false)}
                className="text-sm text-gray-300 hover:text-white underline transition-colors"
              >
                Back to Early Access
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}