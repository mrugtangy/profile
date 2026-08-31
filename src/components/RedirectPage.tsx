import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ExternalLink, ArrowRight, Loader } from 'lucide-react';

interface RedirectPageProps {
  config: any;
}

export const RedirectPage: React.FC<RedirectPageProps> = ({ config }) => {
  const { slug } = useParams<{ slug: string }>();
  const [countdown, setCountdown] = useState(2);
  const [redirected, setRedirected] = useState(false);

  const normalizedSlug = (slug || '').trim().toLowerCase();
  const redirects = config?.redirects || [];
  const redirectItem = redirects.find(
    (r: any) => (r.slug || '').trim().toLowerCase() === normalizedSlug
  );

  useEffect(() => {
    if (!redirectItem) return;

    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          performRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Backup redirect after 2.5 seconds total
    const timeout = setTimeout(() => {
      performRedirect();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [redirectItem]);

  const performRedirect = () => {
    if (redirected || !redirectItem) return;
    setRedirected(true);
    
    // Ensure URL has a protocol
    let targetUrl = redirectItem.url || '';
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }
    
    if (targetUrl) {
      window.location.replace(targetUrl);
    }
  };

  // If redirect does not exist, go to 404
  if (!redirectItem) {
    return <Navigate to="/404" replace />;
  }

  // Ensure target URL has a protocol for the anchor tag
  let cleanUrl = redirectItem.url || '';
  if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // Extract a clean display URL
  let displayUrl = redirectItem.url || '';
  try {
    const urlObj = new URL(cleanUrl);
    displayUrl = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch (e) {
    // fallback to original if parsing fails
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden font-sans">

      <div className="w-full max-w-md px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border-2 border-black rounded-3xl p-8 shadow-sm flex flex-col items-center text-center gap-8"
        >
          {/* Brand Logo */}
          <div className="text-2xl font-black tracking-tighter text-black select-none">
            tangy.
          </div>

          {/* Animating status */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Loader className="animate-spin text-black shrink-0" size={20} />
              <h2 className="text-xl font-black tracking-tight">Redirecting to {redirectItem.slug}...</h2>
            </div>
            {redirectItem.description && (
              <p className="text-xs text-neutral-400 font-medium max-w-xs mx-auto">
                {redirectItem.description}
              </p>
            )}
          </div>

          {/* Countdown indicator */}
          <div className="w-24 h-24 rounded-full border-4 border-neutral-100 flex items-center justify-center relative">
            <span className="text-3xl font-black text-black">{countdown}</span>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="black"
                strokeWidth="4"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: '276.46',
                  strokeDashoffset: (276.46 * (2 - countdown)) / 2,
                }}
              />
            </svg>
          </div>

          <div className="space-y-4 w-full">
            <p className="text-sm text-neutral-500 font-medium">
              You are being redirected to: <br />
              <span className="font-mono font-bold text-black break-all select-all text-xs bg-neutral-50 border border-neutral-200 px-2 py-1 rounded mt-1 inline-block">
                {displayUrl}
              </span>
            </p>

            <div className="pt-2">
              <a
                href={cleanUrl}
                onClick={(e) => {
                  e.preventDefault();
                  performRedirect();
                }}
                className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-full hover:scale-[1.03] active:scale-[0.97] transition-all font-bold text-sm border-2 border-black group"
              >
                Click here if not redirected
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
