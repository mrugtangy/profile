import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DownloadCloud, File, AlertCircle, FileText, Image as ImageIcon, Video, Music, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Turnstile } from '@marsidev/react-turnstile';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
  createdAt: string;
  extension: string;
}

const AdBanner = ({ className = "" }: { className?: string }) => (
  <div className={`bg-neutral-200/50 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 font-mono text-[10px] tracking-widest uppercase rounded-xl overflow-hidden relative ${className}`}>
    <span className="absolute top-2 right-2 text-[8px] bg-neutral-300 text-neutral-600 px-1 rounded-sm">AD</span>
    <span className="opacity-50">Advertisement Space</span>
  </div>
);

export const DownloadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState(15);
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [showAdblockModal, setShowAdblockModal] = useState(false);

  useEffect(() => {
    let detected = false;

    const detectCosmetic = () => {
      const dummy = document.createElement('div');
      dummy.className = 'adsbox';
      dummy.innerHTML = '&nbsp;';
      dummy.style.position = 'absolute';
      dummy.style.left = '-9999px';
      dummy.style.top = '-9999px';
      dummy.style.height = '1px';
      dummy.style.width = '1px';
      document.body.appendChild(dummy);

      const styles = window.getComputedStyle(dummy);
      if (
        dummy.offsetHeight === 0 ||
        styles.display === 'none' ||
        styles.visibility === 'hidden'
      ) {
        detected = true;
      }
      document.body.removeChild(dummy);
    };

    const detectNetwork = async () => {
      try {
        await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
      } catch (err) {
        detected = true;
      }
    };

    const runChecks = async () => {
      detectCosmetic();
      if (!detected) {
        await detectNetwork();
      }
      if (detected) {
        setShowAdblockModal(true);
      }
    };

    const timer = setTimeout(runChecks, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    import('../services/configService').then(({ subscribeToSettings }) => {
      const unsubscribe = subscribeToSettings((data) => {
        setConfig(data);
      });
      return () => unsubscribe();
    });
  }, []);

  useEffect(() => {
    fetch(`/api/files/link/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("File not found or link expired");
        return res.json();
      })
      .then(data => {
        setFileInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && !error && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, loading, error]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (ext: string) => {
    if (ext.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return <ImageIcon size={48} className="text-purple-500" />;
    if (ext.match(/\.(mp4|webm|avi|mov)$/i)) return <Video size={48} className="text-pink-500" />;
    if (ext.match(/\.(mp3|wav|ogg)$/i)) return <Music size={48} className="text-yellow-500" />;
    if (ext.match(/\.(zip|tar|gz|rar)$/i)) return <Archive size={48} className="text-red-500" />;
    if (ext.match(/\.(txt|md|csv|json|js|ts|html|css)$/i)) return <FileText size={48} className="text-green-500" />;
    return <File size={48} className="text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center font-sans p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center border-2 border-black">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Error</h1>
          <p className="text-neutral-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const isReady = countdown === 0 && captchaSolved;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-12 p-4 gap-6 font-sans text-black w-full overflow-x-hidden">
      <AdBanner className="w-full max-w-4xl h-24 sm:h-32 hidden sm:flex shrink-0" />

      <div className="flex w-full max-w-6xl gap-6 items-center sm:items-start justify-center">
        <AdBanner className="w-[160px] lg:w-[300px] h-[600px] hidden md:flex shrink-0" />
        
        <div className="flex flex-col gap-6 w-full max-w-md shrink-0">
          <AdBanner className="w-full h-24 sm:hidden" />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl w-full overflow-hidden border-2 border-black flex flex-col"
          >
        <div className="p-8 border-b-2 border-neutral-100 bg-neutral-50 flex flex-col items-center text-center">
          <div className="mb-4">
            {getFileIcon(fileInfo.extension)}
          </div>
          <h1 className="text-xl font-black tracking-tight break-all mb-2">{fileInfo.name}</h1>
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-neutral-500">
            <span>{formatSize(fileInfo.size)}</span>
            <span>•</span>
            <span className="uppercase">{fileInfo.extension.replace('.', '') || 'FILE'}</span>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-neutral-800 mb-4 w-full text-left">Security Check</h3>
            <div className="w-full flex justify-center overflow-hidden min-h-[65px]">
              {config && (
                <Turnstile 
                  siteKey={config.configs?.turnstileSiteKey || "1x00000000000000000000AA"}
                  onSuccess={() => setCaptchaSolved(true)}
                  onError={() => setCaptchaSolved(false)}
                  options={{
                    theme: 'light',
                    size: 'normal'
                  }}
                />
              )}
            </div>
          </div>

          <AdBanner className="w-full h-32 mb-2" />

          <p className="text-center text-xs font-bold text-neutral-500 uppercase tracking-wider leading-relaxed px-2">
            Ads support our website by keeping files free and powering our high-speed hosting servers!
          </p>

          <a
            href={isReady ? `/files${fileInfo.path}` : '#'}
            download={isReady ? fileInfo.name : undefined}
            className={`
              relative flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all
              ${isReady 
                ? 'bg-black text-white hover:scale-[1.02] active:scale-95' 
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }
            `}
            onClick={(e) => {
              if (!isReady) e.preventDefault();
            }}
          >
            {isReady ? (
              <>
                <DownloadCloud size={20} />
                Download File
              </>
            ) : (
              <span>
                {countdown > 0 ? `Wait ${countdown}s` : 'Solve Captcha'}
              </span>
            )}
          </a>
        </div>
      </motion.div>
      
          <AdBanner className="w-full h-24 md:hidden shrink-0" />
        </div>

        <AdBanner className="w-[160px] lg:w-[300px] h-[600px] hidden md:flex shrink-0" />
      </div>

      <AdBanner className="w-full max-w-4xl h-24 sm:h-32 hidden sm:flex shrink-0" />

      {/* Adblock Warning Modal */}
      <AnimatePresence>
        {showAdblockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdblockModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 w-full max-w-md relative z-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-red-100 border-2 border-black rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="text-red-600" size={32} />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight mb-3">
                Adblocker Detected
              </h2>

              <p className="text-neutral-600 text-sm font-medium leading-relaxed mb-6">
                Ads help us host the files and also pay for the servers that deliver high-speed downloads. If you're using an adblocker, please disable it to support us!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setShowAdblockModal(false)}
                  className="flex-1 px-5 py-3 border-2 border-black rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-neutral-50 active:scale-95 transition-all text-neutral-500 hover:text-black"
                >
                  No thanks
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-5 py-3 bg-black text-white border-2 border-black rounded-xl font-black uppercase tracking-wider text-xs hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Okay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
