import { Link } from 'react-router';
import type { FooterQuery, HeaderQuery } from 'storefrontapi.generated';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <footer className="w-full bg-[#beb1a1] py-8 px-5">
      <div className="max-w-6xl mx-auto">
        {/* Brand Name */}
        <div className="mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-black tracking-tight uppercase text-left">
            SALTY.
          </h2>
        </div>

        {/* Main Content */}
        <div className="flex gap-16 mb-16">
          {/* About Section */}
          <div>
            <h3 className="text-base font-semibold text-black mb-2 uppercase tracking-wide">
              ABOUT
            </h3>
            <div>
              <Link
                to="/pages/about-us"
                className="block text-sm text-black hover:text-gray-700 transition-colors"
              >
                About
              </Link>
              <Link
                to="/pages/terms-conditions"
                className="block text-sm text-black hover:text-gray-700 transition-colors"
              >
                Terms and Conditions
              </Link>
            </div>
          </div>

          {/* Connect Section */}
          <div>
            <h3 className="text-base font-semibold text-black mb-2 uppercase tracking-wide">
              CONNECT
            </h3>
            <div className="">
              <a
                href="https://www.instagram.com/salty.cai/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-black hover:text-gray-700 transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/salty.cai"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-black hover:text-gray-700 transition-colors"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex justify-between items-end">
          <div className="text-[12px] text-black">
            COPYRIGHT 2025 © SALTY.CAI
          </div>
          <div className="text-[12px] text-black">
            SITE BY{' '}
            <a
              href="https://talyawy.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              TALYAWY.DEV
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
