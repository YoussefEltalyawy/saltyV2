import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle } from 'lucide-react';
import { safeLocalStorage } from '~/lib/utils';

interface NewsletterPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewsletterPopup({ isOpen, onClose }: NewsletterPopupProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const fetcher = useFetcher();
  const actionData = fetcher.data as {
    success?: boolean;
    error?: string;
    message?: string;
  } | undefined;
  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (actionData?.success) {
      setIsSubmitted(true);
      setShowCode(true);
      safeLocalStorage.setItem('newsletterSubscribed', 'true');
      const timer = setTimeout(() => {
        setShowCode(false);
        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
          setEmail('');
          setName('');
        }, 500); // allow out animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionData?.success, onClose]);

  const handleClose = () => {
    safeLocalStorage.setItem('newsletterDismissed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const brandColor = 'bg-[#beb1a1]';
  const brandFocus = 'focus:ring-[#beb1a1]';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full bg-white shadow-2xl overflow-hidden"
          style={{ bottom: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close popup"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-8">
            {!isSubmitted ? (
              <>
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                  Join the Salty Club
                </h2>
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  Join the exclusive Salty Club for early access to new releases, secret deals, and insider news. Submit your details and become a member!
                </p>
                <fetcher.Form method="post" action="/api/newsletter-subscribe">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="sr-only">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        className={[
                          "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all",
                          brandFocus,
                          actionData?.error ? "border-red-500 focus:ring-red-500" : ''
                        ].join(' ')}
                        required
                        disabled={isSubmitting}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="sr-only">Email address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className={[
                          "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all",
                          brandFocus,
                          actionData?.error ? "border-red-500 focus:ring-red-500" : ''
                        ].join(' ')}
                        required
                        disabled={isSubmitting}
                        autoComplete="email"
                      />
                      {actionData?.error && (
                        <p className="mt-2 text-sm text-red-600">
                          {actionData.error}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !email || !name}
                      className={[
                        "w-full py-3 px-6 text-white font-semibold rounded-lg transition-all duration-200",
                        brandColor,
                        brandFocus,
                        "hover:opacity-90 focus:ring-2 focus:ring-offset-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transform hover:scale-[1.02] active:scale-[0.98]"
                      ].join(' ')}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Subscribing...
                        </div>
                      ) : (
                        "Subscribe Now"
                      )}
                    </button>
                  </div>
                </fetcher.Form>
                <p className="text-xs text-gray-500 text-center mt-4">
                  By subscribing, you agree to receive marketing emails from us. You can unsubscribe at any time.
                </p>
              </>
            ) : (
              <AnimatePresence>
                {showCode && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="text-center"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Welcome to the Salty Club! 🎉
                    </h2>
                    <p className="text-gray-600 mb-4">
                      You’re officially in! Enjoy your exclusive perks and keep an eye on your inbox for secret club updates.
                    </p>
                    <div className="mb-2">
                      <span className="block text-lg font-semibold text-gray-800">Your code:</span>
                      <div className="flex items-center justify-center mt-2">
                        <input
                          type="text"
                          value="CLUB10"
                          readOnly
                          className="text-center font-mono text-xl px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 select-all cursor-pointer"
                          onFocus={e => e.target.select()}
                          onClick={e => (e.target as HTMLInputElement).select()}
                          aria-label="Copy code CLUB10"
                        />
                      </div>
                      <span className="block text-xs text-gray-500 mt-2">Copy and use this code at checkout!</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 