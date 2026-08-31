import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Home, AlertCircle, ShieldAlert, Ghost, Construction, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type ErrorType = 400 | 401 | 403 | 404 | 503;

interface ErrorPageProps {
  code: ErrorType;
  message?: string;
}

const errorDetails: Record<ErrorType, {
  title: string;
  defaultMessage: string;
  icon: React.ReactNode;
}> = {
  400: {
    title: "Bad Request",
    defaultMessage: "Oops! Something went wrong with the data sent. Let's try that again from the start.",
    icon: <AlertCircle size={48} className="text-black" />
  },
  401: {
    title: "Unauthorized",
    defaultMessage: "Hold up! You need to be logged in to see this corner of the universe.",
    icon: <ShieldAlert size={48} className="text-black" />
  },
  403: {
    title: "Forbidden",
    defaultMessage: "Access Denied. This area is strictly off-limits for your current clearance level.",
    icon: <Ban size={48} className="text-black" />
  },
  404: {
    title: "Not Found",
    defaultMessage: "Looks like you've wandered into the void. This page doesn't exist (yet!).",
    icon: <Ghost size={48} className="text-black" />
  },
  503: {
    title: "Service Unavailable",
    defaultMessage: "We're currently refilling the juice. The system is under maintenance or overloaded.",
    icon: <Construction size={48} className="text-black" />
  }
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ code, message }) => {
  const navigate = useNavigate();
  const detail = errorDetails[code];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8 max-w-md w-full"
      >
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="p-4 bg-neutral-50 rounded-3xl border-2 border-black/5"
          >
            {detail.icon}
          </motion.div>
          
          <div className="space-y-4">
            <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter text-black leading-none font-sans">
              {code}
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
              {detail.title}
            </h2>
          </div>
        </div>

        <p className="text-neutral-500 font-medium leading-relaxed">
          {message || detail.defaultMessage}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            className="flex items-center justify-center gap-2 px-8 py-3 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-3 border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-all"
          >
            <Home size={18} />
            Home
          </button>
        </div>

        <div className="pt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-300">
            tangy_error_protocol // v1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};
