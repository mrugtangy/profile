/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTelegram } from "@fortawesome/free-brands-svg-icons";
import { 
  ArrowLeft,
  ChevronRight,
  Mail,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Send,
  Heart,
  Landmark,
  X,
  ExternalLink,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate,
  Link
} from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { subscribeToSettings } from "./services/configService";
import { Login } from "./components/Admin/Login";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { ConfigSetup } from "./components/ConfigSetup";
import { authService } from "./services/authService";
import { ErrorPage } from "./components/ErrorPage";
import { DownloadPage } from "./components/DownloadPage";
import { RedirectPage } from "./components/RedirectPage";
import { INITIAL_CONFIG, ASSETS, SOCIAL_LINKS } from "./constants";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Turnstile } from '@marsidev/react-turnstile';

const CopyableText = ({ children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const text = e.currentTarget.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span 
      onClick={handleCopy} 
      className="inline-flex items-center gap-1 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded transition-colors border border-neutral-200 text-neutral-800 font-mono text-[10px] sm:text-xs"
      title="Click to copy"
      {...props}
    >
      {children}
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-neutral-400" />}
    </span>
  );
};

const CustomMarkdown = ({ children, className = "" }: { children: string, className?: string }) => (
  <div className={`prose prose-neutral max-w-none prose-headings:text-inherit prose-headings:font-black prose-p:m-0 prose-a:text-inherit font-sans ${className}`}>
    <Markdown 
      remarkPlugins={[remarkGfm]} 
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({node, ...props}) => <span className="font-bold block" {...props} />,
        h2: ({node, ...props}) => <span className="font-bold block" {...props} />,
        h3: ({node, ...props}) => <span className="font-bold block" {...props} />,
        h4: ({node, ...props}) => <span className="font-bold block" {...props} />,
        p: ({node, ...props}) => <span className="block" {...props} />,
        kbd: ({node, ...props}) => <CopyableText {...props} />,
      }}
    >
      {children}
    </Markdown>
  </div>
);

// --- Types ---
type SectionId = "home" | "menu-about" | "menu-communities" | "menu-links" | "menu-contact" | "menu-donate" | "menu-setup" | "menu-projects";

// --- Components ---

const DonateSection = ({ config }: { config: any }) => {
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [selectedLocal, setSelectedLocal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activePopup, setActivePopup] = useState<any>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!config) return null;

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Crypto Section */}
      <div className="bg-white border-2 border-black rounded-3xl p-8 flex flex-col items-center">
        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2 mb-6 self-start">
          <Send size={14} className="text-black" /> Crypto Currency
        </label>

        {config.cryptoDescription && (
          <div className="text-xs font-medium text-neutral-500 mb-6 w-full leading-relaxed prose prose-sm max-w-none">
            <CustomMarkdown>{config.cryptoDescription}</CustomMarkdown>
          </div>
        )}
        
        {config.crypto && config.crypto.length > 0 ? (
          <div className="w-full space-y-6">
            <div className="flex flex-wrap gap-2">
              {config.crypto?.map((crypto: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedCrypto(index)}
                  className={`px-4 py-2 rounded-xl border-2 font-bold text-xs uppercase tracking-widest transition-all ${ selectedCrypto === index ? "bg-black text-white border-black" : "bg-white text-black border-neutral-100 hover:border-black" }`}
                >
                  {crypto.network}
                </button>
              ))}
            </div>

            <div className="bg-neutral-50 rounded-2xl p-6 border-2 border-neutral-100 flex flex-col items-center text-center">
              <div className="bg-white p-4 rounded-xl border-2 border-black mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.crypto?.[selectedCrypto]?.address || "")}`} 
                  alt="QR Code" 
                  className="w-32 h-32 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] font-black uppercase text-neutral-400 mb-2">Wallet Address</p>
              <div className="bg-black text-white px-4 py-3 rounded-xl w-full break-all font-mono text-xs mb-4">
                {config.crypto?.[selectedCrypto]?.address}
              </div>
              <button
                onClick={() => copyToClipboard(config.crypto?.[selectedCrypto]?.address || "")}
                className="flex items-center gap-2 px-6 py-2 bg-white border-2 border-black rounded-full font-bold hover:bg-black hover:text-white transition-all text-sm"
              >
                {copied ? <><Lock size={16} /> Copied!</> : <><Copy size={16} /> Copy Address</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full py-12 px-6 text-center text-neutral-400 font-bold text-sm uppercase tracking-widest border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2">
            <span>No methods present.</span>
            <span>Come back later :)</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Other Ways Section */}
        <div className="bg-white border-2 border-black rounded-3xl p-8 ">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2 mb-6">
            <Heart size={14} className="text-black" /> Other Ways
          </label>
          
          {(!config.other || !Array.isArray(config.other) || config.other.length === 0) ? (
            <div className="w-full py-12 px-6 text-center text-neutral-400 font-bold text-sm uppercase tracking-widest border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <span>No methods present.</span>
              <span>Come back later :)</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {config.other.map((link: any, i: number) => {
                if (link.type === 'popup') {
                  return (
                    <button 
                      key={i}
                      onClick={() => setActivePopup(link)}
                      title={link.title}
                      className="flex items-center gap-3 justify-center px-6 py-4 border-2 border-black text-black bg-white rounded-2xl hover:bg-black hover:text-white active:scale-95 transition-all h-14"
                    >
                      {link.icon && <i className={`${link.icon} text-lg`}></i>}
                      <span className="font-bold text-sm whitespace-nowrap">{link.title}</span>
                    </button>
                  );
                }
                
                return (
                  <a 
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.title}
                    className="flex items-center gap-3 justify-center px-6 py-4 border-2 border-black text-black bg-white rounded-2xl hover:bg-black hover:text-white active:scale-95 transition-all h-14"
                  >
                    {link.icon && <i className={`${link.icon} text-lg`}></i>}
                    <span className="font-bold text-sm whitespace-nowrap">{link.title}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Local Methods Section */}
        <div className="bg-white border-2 border-black rounded-3xl p-8 flex flex-col items-center">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2 mb-6 self-start">
            <Landmark size={14} className="text-black" /> Local methods (Mauritius Only)
          </label>

          {config.localMethodsDescription && (
            <div className="text-xs font-medium text-neutral-500 mb-6 w-full leading-relaxed prose prose-sm max-w-none">
              <CustomMarkdown>{config.localMethodsDescription}</CustomMarkdown>
            </div>
          )}
          
          {config.localMethods && config.localMethods.length > 0 ? (
            <div className="w-full space-y-6">
              <div className="flex flex-wrap gap-2">
                {config.localMethods?.map((local: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedLocal(index)}
                    className={`px-4 py-2 rounded-xl border-2 font-bold text-xs uppercase tracking-widest transition-all ${ selectedLocal === index ? "bg-black text-white border-black" : "bg-white text-black border-neutral-100 hover:border-black" }`}
                  >
                    {local.provider}
                  </button>
                ))}
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6 border-2 border-neutral-100 flex flex-col items-center text-center w-full">
                <div className="bg-white p-4 rounded-xl border-2 border-black w-fit">
                  <img 
                    src={config.localMethods?.[selectedLocal]?.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.localMethods?.[selectedLocal]?.address || config.localMethods?.[selectedLocal]?.provider || "")}`} 
                    alt="Local QR Code" 
                    className="w-32 h-32 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase text-neutral-400">Scan to pay via {config.localMethods?.[selectedLocal]?.provider}</p>
                {config.localMethods?.[selectedLocal]?.address && (
                  <div className="mt-4 flex items-center justify-between w-full p-4 bg-white border-2 border-neutral-200 rounded-2xl">
                    <span className="font-mono font-bold text-sm truncate">
                      {config.localMethods?.[selectedLocal]?.address}
                    </span>
                    <button 
                      onClick={() => {
                         navigator.clipboard.writeText(config.localMethods?.[selectedLocal]?.address || "");
                      }}
                      className="ml-4 p-2 bg-black text-white rounded-xl hover:scale-110 active:scale-95 transition-all"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full py-12 px-6 text-center text-neutral-400 font-bold text-sm uppercase tracking-widest border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <span>No methods present.</span>
              <span>Come back later :)</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePopup(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center border-2 border-neutral-200 mb-6">
                {activePopup.icon ? <i className={`${activePopup.icon} text-2xl text-black`}></i> : <Heart size={24} className="text-black" />}
              </div>
              
              <h3 className="text-xl font-black tracking-tight mb-2">{activePopup.title}</h3>
              
              {activePopup.popupDescription && (
                <div className="text-sm font-medium text-neutral-500 mb-8 w-full leading-relaxed prose prose-sm max-w-none">
                  <CustomMarkdown>{activePopup.popupDescription}</CustomMarkdown>
                </div>
              )}
              
              <div className="flex flex-col gap-3 w-full mt-auto">
                {activePopup.popupUrl && (
                  <a
                    href={activePopup.popupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    {activePopup.popupButtonText || "Visit Link"} <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => setActivePopup(null)}
                  className="w-full py-4 bg-neutral-100 text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Typewriter = ({ quotes }: { quotes: string[] }) => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!quotes || quotes.length === 0) return;

    const currentQuote = quotes[currentQuoteIndex % quotes.length] || "";
    
    const handleTyping = () => {
      if (!isDeleting) {
        if (displayText.length < currentQuote.length) {
          setDisplayText(currentQuote.slice(0, displayText.length + 1));
        } else {
          // Pause at the end of the quote
          setTimeout(() => setIsDeleting(true), 3000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentQuote.slice(0, displayText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
        }
      }
    };

    const speed = isDeleting ? 40 : 80;
    const timeout = setTimeout(handleTyping, speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentQuoteIndex, quotes]);

  if (!quotes || quotes.length === 0) return (
    <div className="flex justify-center mt-2 min-h-[2.5rem]" />
  );

  return (
    <div className="flex justify-center mt-2 min-h-[3.5rem] px-6 text-center">
      <div className="text-base sm:text-xl md:text-2xl font-semibold text-neutral-700 flex items-center justify-center flex-wrap gap-y-2">
        <span>{displayText}</span>
      </div>
    </div>
  );
};

const SectionWrapper = ({ children, title, onBack }: { children: React.ReactNode, title: string, onBack: () => void }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="w-full flex flex-col items-center pb-32 md:pb-0"
  >
    <div className="w-full flex flex-col items-center mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6">{title}</h2>
      <div className="w-full">
        {children}
      </div>
      <button 
        onClick={onBack}
        className="hidden md:flex mt-10 items-center gap-2 px-6 py-2 border-2 border-black bg-white text-black rounded-full hover:bg-black hover:text-white transition-all duration-300 font-medium"
      >
        <ArrowLeft size={20} /> Back to Menu
      </button>

    </div>
  </motion.section>
);

const Card = ({ item, onClick }: { item: any; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="relative border-2 border-black rounded-3xl p-4 sm:p-5 transition-all duration-300 flex items-center gap-4 group hover:border-black h-full w-full outline-none overflow-hidden"
  >
    {item.banner ? (
      <>
        <div className="absolute inset-0 z-0 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
          <img src={item.banner} alt="banner" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/95 to-transparent group-hover:from-black group-hover:via-black/90 transition-colors duration-300" />
      </>
    ) : (
      <div className="absolute inset-0 z-0 bg-white group-hover:bg-black transition-colors duration-300" />
    )}
    
    <div className="relative z-10 flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-black overflow-hidden bg-white">
      <img 
        src={item.profile || item.banner} 
        alt={item.title} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 bg-white" 
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="relative z-10 flex flex-col flex-grow overflow-hidden text-left py-2">
      <h3 className="text-lg sm:text-xl font-bold truncate group-hover:text-white transition-colors duration-300">
        {item.title}
      </h3>
    </div>
    <div className="relative z-10 flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:text-white transition-all duration-300 translate-x-0 group-hover:translate-x-1">
      <ArrowRight size={24} />
    </div>
  </button>
);

const ShoppingCard = ({ item, onClick }: { item: any; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-row sm:flex-col border-2 border-black rounded-3xl overflow-hidden bg-white transition-all duration-300 group hover:-translate-y-2 outline-none text-left w-full h-auto sm:h-full"
  >
    <div className="w-1/3 min-w-[120px] sm:w-full sm:min-w-0 sm:aspect-[4/3] bg-neutral-100 relative overflow-hidden border-r-2 sm:border-r-0 sm:border-b-2 border-black shrink-0">
      <img 
        src={item.banner || item.profile} 
        alt={item.title} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
      <div className="hidden sm:block absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-black text-black">
        Setup
      </div>
    </div>
    <div className="flex flex-col flex-1 p-4 sm:p-5 w-full">
      <h3 className="font-bold text-base sm:text-lg text-black mb-1 sm:mb-2 line-clamp-2 sm:line-clamp-1">{item.title}</h3>
      <div className="text-xs sm:text-sm text-neutral-500 line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-6 flex-1 pr-2">
        {item.description}
      </div>
      <div className="w-fit sm:w-full py-2 px-4 sm:py-3 sm:px-0 bg-black text-white hover:bg-neutral-800 rounded-xl font-bold text-xs sm:text-base transition-colors flex items-center justify-center gap-2 mt-auto">
        <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">View item</span><span className="sm:hidden">View</span>
      </div>
    </div>
  </button>
);


const ContactSection = ({ config, globalConfig }: { config: any, globalConfig?: any }) => {
  const [emailVisible, setEmailVisible] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = () => {
    setRevealing(true);
  };

  const handleTurnstileSuccess = () => {
    setEmailVisible(true);
    setRevealing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !messageText) {
      setError('All fields are required.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await addDoc(collection(db, 'messages'), {
        name,
        email,
        subject,
        message: messageText,
        createdAt: serverTimestamp(),
        read: false
      });
      setSentSuccess(true);
      // Reset form
      setName('');
      setEmail('');
      setSubject('');
      setMessageText('');
    } catch (err: any) {
      console.error(err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const siteKey = globalConfig?.configs?.turnstileSiteKey || config?.turnstileSiteKey || "1x00000000000000000000AA";

  return (
    <div className="w-full max-w-lg bg-white border-2 border-black rounded-3xl p-8 text-black relative">
      <div className="space-y-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
            <Mail size={14} className="text-black" /> Direct Inbox
          </label>
          <div className="group relative">
            <div className={`w-full ${emailVisible ? 'h-auto py-4' : revealing ? 'min-h-[72px] py-1' : 'h-16'} bg-neutral-50 border-2 border-black rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300`}>
              <AnimatePresence mode="wait">
                {!emailVisible ? (
                  !revealing ? (
                    <motion.button
                      key="gate"
                      onClick={handleReveal}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 font-black uppercase tracking-widest text-xs hover:text-neutral-500 transition-colors"
                    >
                      <Lock size={14} /> Reveal Email
                    </motion.button>
                  ) : (
                    <motion.div
                      key="turnstile"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-center p-1"
                    >
                      <Turnstile 
                        siteKey={siteKey} 
                        onSuccess={handleTurnstileSuccess} 
                      />
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key="email"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center gap-3 w-full px-4"
                  >
                    <div className="flex items-center justify-between w-full p-3 bg-white border-2 border-neutral-100 rounded-xl">
                      <span className="font-mono font-bold text-sm select-all truncate">{config.email}</span>
                      <button 
                        onClick={() => copyToClipboard(config.email)}
                        className="p-2 hover:bg-black hover:text-white rounded-lg transition-colors border border-transparent"
                        title="Copy Email"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setSentSuccess(false);
                        setShowContactForm(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all w-full justify-center"
                    >
                      <Send size={12} /> Send a Mail
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-2">
          <a 
            href={`https://t.me/${config.telegram?.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all border-2 border-black"
            title="Telegram"
          >
            <FontAwesomeIcon icon={faTelegram} className="text-3xl relative -left-[1px]" />
          </a>
        </div>

        <div className="pt-4 border-t border-neutral-100 pt-6">
          <CustomMarkdown className="text-black">{config.description}</CustomMarkdown>
        </div>
      </div>

      {/* Message Composer Modal overlay */}
      <AnimatePresence>
        {showContactForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-10 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowContactForm(false)}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors border border-transparent hover:border-black"
              >
                <X size={18} />
              </button>

              <AnimatePresence mode="wait">
                {!sentSuccess ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-2 border-b border-neutral-100 pb-3">
                      <Mail size={18} className="text-black" />
                      <h3 className="text-lg font-black uppercase tracking-tight">Send a Mail</h3>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
                        {error}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest font-mono">Your Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest font-mono">Your Email</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest font-mono">Subject</label>
                      <input 
                        type="text" 
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Inquiry / Feedback / Hello"
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest font-mono">Message</label>
                      <textarea 
                        required
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Write your message here..."
                        rows={4}
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full py-3 sm:py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} /> Send Message
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center border-2 border-green-200 mb-6">
                      <Check size={32} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Message Sent!</h3>
                    <p className="text-sm font-medium text-neutral-500 mb-8 max-w-xs leading-relaxed">
                      Thank you for reaching out. Your message has been sent successfully!
                    </p>
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="px-8 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors"
                    >
                      Close Window
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileIDCard = ({ config, pfp }: { config: typeof INITIAL_CONFIG.profileConfig, pfp: string }) => {
  const age = (() => {
    const birthDate = new Date(config.birthDate);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  })();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto text-left space-y-8 p-4 font-sans text-black"
    >
      <div className="flex flex-col w-full border-2 border-black rounded-2xl bg-white overflow-hidden relative">
        <div className="bg-black text-white px-4 py-2 flex items-center justify-between font-mono relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase">ID Card</span>
          </div>
          <span className="text-[10px] opacity-50 font-bold uppercase">ID: 849201-A</span>
        </div>
        
        <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-10 bg-neutral-50/50">
          {pfp && (
            <div className="w-28 h-32 rounded-lg overflow-hidden border-2 border-black shrink-0 relative bg-neutral-200">
              <img 
                src={pfp} 
                alt="Profile" 
                className="w-full h-full object-cover grayscale contrast-125"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay pointer-events-none" />
            </div>
          )}
          
          <div className="flex flex-col gap-4 w-full justify-center">
            <div>
              <h3 className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-0.5 font-mono">name :</h3>
              <p className="text-xl font-black uppercase">{config.name}</p>
            </div>

            <div className="flex flex-wrap gap-8">
              <div>
                <h3 className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-0.5 font-mono">age:</h3>
                <p className="text-lg font-bold uppercase leading-none">{age}</p>
              </div>

              <div>
                <h3 className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-0.5 font-mono">country:</h3>
                <p className="text-lg font-bold uppercase leading-none">{config.country}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none z-0">
          <svg width="200" height="200" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="2" fill="none" />
             <circle cx="50" cy="50" r="30" stroke="black" strokeWidth="2" fill="none" />
             <path d="M10,50 h80 M50,10 v80" stroke="black" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase text-neutral-400 tracking-widest mb-4">Interests</h3>
        <div className="text-sm font-medium leading-relaxed">
          <CustomMarkdown>{Array.isArray(config.interests) ? config.interests.join('\n') : (config.interests || '')}</CustomMarkdown>
        </div>
      </div>

      <hr className="border-t-2 border-black/10" />

      <div>
        <h3 className="text-xs font-black uppercase text-neutral-400 tracking-widest mb-4">Skills</h3>
        <div className="text-sm font-medium leading-relaxed">
          <CustomMarkdown>{Array.isArray(config.skills) ? config.skills.join('\n') : (config.skills || '')}</CustomMarkdown>
        </div>
      </div>

      <hr className="border-t-2 border-black/10" />

      <div>
        <h3 className="text-xs font-black uppercase text-neutral-400 tracking-widest mb-4">Games Library</h3>
        <div className="text-sm font-medium leading-relaxed [&_p]:flex [&_p]:flex-wrap [&_p]:gap-2 [&_li]:border [&_li]:border-black/20 [&_li]:px-3 [&_li]:py-1 [&_li]:rounded-full [&_li]:bg-neutral-50 [&_li]:list-none">
          <CustomMarkdown>{Array.isArray(config.games) ? config.games.join('\n') : (config.games || '')}</CustomMarkdown>
        </div>
      </div>

      {config.footerQuote && (
        <>
          <hr className="border-t-2 border-black/10" />
          <div className="text-[10px] font-mono tracking-[0.2em] font-bold text-neutral-400 uppercase text-center pt-4">
            {config.footerQuote}
          </div>
        </>
      )}
    </motion.div>
  );
};

function MainApp({ config, loading, user }: { config: any, loading: boolean, user: FirebaseUser | null }) {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [easterEggCount, setEasterEggCount] = useState(0);
  const [easterEggPhase, setEasterEggPhase] = useState<"dots" | "life" | "quote" | "love" | "smile">("dots");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminUser = await authService.getCurrentUser();
        setIsAdminLoggedIn(!!adminUser);
      } catch {
        setIsAdminLoggedIn(false);
      }
    };
    checkAdmin();
  }, []);

  const handleEasterEgg = useCallback(() => {
    if (easterEggCount === 0) {
      setEasterEggCount(1);
      setEasterEggPhase("life");
    } else if (easterEggCount === 1) {
      setEasterEggCount(2);
      setEasterEggPhase("quote");
    } else if (easterEggCount === 2) {
      setEasterEggCount(3);
      setEasterEggPhase("love");
      setTimeout(() => {
        setEasterEggPhase("smile");
        setTimeout(() => {
          window.location.href = "https://instagram.com/oc_qte/";
        }, 2000);
      }, 1500);
    }
  }, [easterEggCount]);

  const MenuButton = ({ id, label }: { id: SectionId, label: string }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveSection(id)}
      className="border-2 border-black rounded-full px-8 py-4 text-sm sm:text-base md:text-lg font-bold bg-white text-black transition-all duration-300 hover:bg-black hover:text-white"
    >
      {label}
    </motion.button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden transition-colors duration-500 bg-white relative">
      {isAdminLoggedIn && (
        <div className="absolute top-4 right-4 z-50">
          <Link to="/admin" className="px-4 py-2 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Admin Panel
          </Link>
        </div>
      )}
      
      {/* PERSISTENT TOP SECTION */}
      <div className="w-full relative shrink-0">
        <div className="w-full aspect-[5/1] sm:aspect-[6/1] md:aspect-[6/1] bg-neutral-100 overflow-hidden">
          {config.mainPage?.banner && (
            <img 
              src={config.mainPage.banner} 
              alt="banner" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16 sm:-bottom-20 z-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white bg-neutral-100"
          >
            {config.mainPage?.pfp && (
              <img 
                src={config.mainPage.pfp} 
                alt="profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            )}
          </motion.div>
        </div>
      </div>

      <header className="w-full max-w-4xl mx-auto px-4 text-center mt-20 sm:mt-24 md:mt-28 shrink-0">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-4 text-black flex flex-col items-center">
          <CustomMarkdown>
            {config.mainPage?.title || ""}
          </CustomMarkdown>
        </div>

        {/* Social Icons */}
        <div className="flex justify-center flex-wrap gap-2 sm:gap-3 lg:gap-4">
          {SOCIAL_LINKS.map((social, i) => (
            <motion.a 
              key={i}
              href={social.link} 
              whileHover={{ y: -5, scale: 1.1 }}
              title={social.label}
              className="text-black transition-colors hover:text-gray-600 p-2 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={social.icon} className="text-2xl sm:text-3xl" />
            </motion.a>
          ))}
        </div>

        <Typewriter quotes={config.quotes || []} />
      </header>

      {/* DYNAMIC BOTTOM SECTION */}
      <main className="w-full max-w-6xl mx-auto px-4 mt-2 mb-8 relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeSection === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center"
            >
              {/* Menu Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
                <MenuButton id="menu-about" label="about me" />
                <MenuButton id="menu-donate" label="donate" />
                <MenuButton id="menu-contact" label="contact" />
                <MenuButton id="menu-setup" label="my setup" />
                <MenuButton id="menu-projects" label="my projects" />
                <MenuButton id="menu-communities" label="my communities" />
                <MenuButton id="menu-links" label="my links" />
              </div>

              {/* Easter Egg */}
              <div className="flex flex-col items-center mt-12">
                <motion.button
                  onClick={handleEasterEgg}
                  whileTap={{ scale: 1.5 }}
                  className="text-4xl font-bold cursor-pointer select-none opacity-60 hover:opacity-100 transition-opacity flex gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5, 
                        delay: i * 0.3,
                        ease: "linear"
                      }}
                    >
                      .
                    </motion.span>
                  ))}
                </motion.button>
                <div className="mt-4 font-bold tracking-widest text-gray-400 h-8 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {easterEggPhase !== "dots" && (
                      <motion.div
                        key={easterEggPhase}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-lg sm:text-xl"
                      >
                        {easterEggPhase === "life" && "#life"}
                        {easterEggPhase === "quote" && "#quote"}
                        {easterEggPhase === "love" && "#love"}
                        {easterEggPhase === "smile" && <span className="text-4xl text-black">:)</span>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="active-section"
              className="w-full flex justify-center"
            >
              {activeSection === "menu-about" && (
                <SectionWrapper title="about me" onBack={() => setActiveSection("home")}>
                  <div className="w-full flex justify-center py-4">
                    <ProfileIDCard config={config.profileConfig} pfp={config.mainPage?.pfp} />
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-donate" && (
                <SectionWrapper key="donate-section" title="donate" onBack={() => setActiveSection("home")}>
                  <div className="w-full flex justify-center py-4">
                    <DonateSection config={config.donations || INITIAL_CONFIG.donations} />
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-contact" && (
                <SectionWrapper title="contact" onBack={() => setActiveSection("home")}>
                  <div className="w-full flex justify-center py-4">
                    <ContactSection config={config.contact} globalConfig={config} />
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-setup" && (
                <SectionWrapper title="my setup" onBack={() => setActiveSection("home")}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl mx-auto">
                    {config.setup?.map((item: any, i: number) => (
                      <ShoppingCard key={i} item={item} onClick={() => setSelectedCard(item)} />
                    ))}
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-projects" && (
                <SectionWrapper title="my projects" onBack={() => setActiveSection("home")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl mx-auto">
                    {config.projects?.map((item: any, i: number) => (
                      <Card key={i} item={item} onClick={() => setSelectedCard(item)} />
                    ))}
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-communities" && (
                <SectionWrapper title="my communities" onBack={() => setActiveSection("home")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl mx-auto">
                    {config.communities?.map((item: any, i: number) => (
                      <Card key={i} item={item} onClick={() => setSelectedCard(item)} />
                    ))}
                  </div>
                </SectionWrapper>
              )}

              {activeSection === "menu-links" && (
                <SectionWrapper title="my links" onBack={() => setActiveSection("home")}>
                  <div className="w-full max-w-4xl mx-auto space-y-12">
                    {config.referrals && config.referrals.length > 0 && (
                      <div className="space-y-6">
                        <div className="border-b-2 border-black pb-2 text-left">
                          <h3 className="text-xl font-black uppercase tracking-tight text-black">Referral Links</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
                          {config.referrals.map((item: any, i: number) => (
                            <Card key={i} item={item} onClick={() => setSelectedCard(item)} />
                          ))}
                        </div>
                      </div>
                    )}

                    {config.links && config.links.length > 0 && (
                      <div className="space-y-6">
                        <div className="border-b-2 border-black pb-2 text-left">
                          <h3 className="text-xl font-black uppercase tracking-tight text-black">Other Links</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
                          {config.links.map((item: any, i: number) => (
                            <Card key={i} item={item} onClick={() => setSelectedCard(item)} />
                          ))}
                        </div>
                      </div>
                    )}

                    {(!config.referrals || config.referrals.length === 0) && (!config.links || config.links.length === 0) && (
                      <div className="text-center py-12 text-neutral-400">
                        No links available.
                      </div>
                    )}
                  </div>
                </SectionWrapper>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg border-2 border-black flex flex-col relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm hover:bg-white text-black border-2 border-black rounded-full transition-colors leading-none"
              >
                <X size={20} />
              </button>

              {selectedCard.banner && (
                <div className="w-full h-32 sm:h-48 relative border-b-2 border-black shrink-0 bg-neutral-100">
                  <img 
                    src={selectedCard.banner} 
                    alt="banner" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/5" />
                </div>
              )}

              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-center gap-4 relative">
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-black overflow-hidden bg-white shrink-0 ${selectedCard.banner ? '-mt-16 sm:-mt-20 z-10' : ''}`}>
                    <img 
                      src={selectedCard.profile || selectedCard.banner} 
                      alt={selectedCard.title} 
                      className="w-full h-full object-cover bg-white" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className={`${selectedCard.banner ? 'pt-2' : ''} flex-grow overflow-hidden`}>
                    <h2 className="text-2xl sm:text-3xl font-black truncate">{selectedCard.title}</h2>
                  </div>
                </div>

                {selectedCard.description && (
                  <div className="text-neutral-600 prose prose-sm sm:prose-base leading-relaxed border-t-2 border-neutral-100 pt-6">
                    <CustomMarkdown>{selectedCard.description}</CustomMarkdown>
                  </div>
                )}

                <div className="pt-2">
                  <a 
                    href={selectedCard.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-full hover:scale-105 active:scale-95 transition-all font-bold text-lg"
                  >
                    Visit Link
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="w-full bg-white text-black py-8 mt-auto border-t border-neutral-100 shrink-0">
        <div className="max-w-4xl mx-auto px-4 text-center flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-neutral-600 font-sans">made with 🖤 by tangy</p>
          <div className="flex flex-col items-center">
             <img 
               src={ASSETS.LOGO} 
               alt="logo" 
               className="h-12 w-auto grayscale contrast-125 opacity-90 transition-all hover:grayscale-0"
               referrerPolicy="no-referrer"
             />
          </div>
          <p className="text-neutral-400 text-[10px] tracking-wider font-sans lowercase">© {new Date().getFullYear()} tangy. all rights reserved.</p>
        </div>
      </footer>

      {/* Floating Mobile Back Button */}
      <AnimatePresence>
        {activeSection !== "home" && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-12 left-0 right-0 flex justify-center md:hidden pointer-events-none px-6 z-50"
          >
            <button 
              onClick={() => setActiveSection("home")}
              className="pointer-events-auto flex items-center gap-3 px-8 py-4 bg-white text-black border-2 border-black rounded-full font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
              Back to Menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AdminRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const configured = await authService.isConfigured();
        setIsConfigured(configured);
        if (!configured) {
          setLoading(false);
          return;
        }
        const user = await authService.getCurrentUser();
        setIsAuth(!!user);
      } catch {
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return <Navigate to="/admin/setup" replace />;
  }

  if (!isAuth) {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminPanel />;
};

const LoginRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const configured = await authService.isConfigured();
        setIsConfigured(configured);
        if (!configured) {
          setLoading(false);
          return;
        }
        const user = await authService.getCurrentUser();
        setIsAuth(!!user);
      } catch {
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return <Navigate to="/admin/setup" replace />;
  }

  if (isAuth) {
    return <Navigate to="/admin" replace />;
  }

  return <Login />;
};

const SetupRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const configured = await authService.isConfigured();
        setIsConfigured(configured);
      } catch {
        setIsConfigured(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isConfigured) {
    return <Navigate to="/admin/login" replace />;
  }

  return <ConfigSetup onComplete={() => window.location.href = '/admin/login'} />;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((data) => {
      if (data) {
        // Deep merge top level sections to ensure defaults exist for new sections
        const merged = { ...INITIAL_CONFIG, ...data };
        
        // Ensure donations specially if it was partially set or missing
        merged.donations = { 
          ...INITIAL_CONFIG.donations, 
          ...(data.donations || {}) 
        };
        
        setConfig(merged);
      } else {
        setConfig(INITIAL_CONFIG);
      }
      // Use a small delay to ensure React state has settled and avoid flashing default config
      setTimeout(() => {
        setConfigLoading(false);
      }, 500);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (config?.configs?.googleAdsClient) {
      const scriptId = 'google-ads-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.configs.googleAdsClient}`;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }
    }
  }, [config?.configs?.googleAdsClient]);

  const isDataReady = !authLoading && !configLoading && config;

  return (
    <AnimatePresence mode="wait">
      {!isDataReady ? (
        <motion.div 
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center font-sans"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-8"
          >
            tangy.
          </motion.h1>
          <div className="w-48 h-1 bg-neutral-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute inset-0 bg-black rounded-full"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen"
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainApp config={config} loading={configLoading} user={user} />} />
              <Route path="/download/:id" element={<DownloadPage />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/admin/login" element={<LoginRoute />} />
              <Route path="/admin/setup" element={<SetupRoute />} />
              
              {/* Error Pages for preview */}
              <Route path="/400" element={<ErrorPage code={400} message={config?.errorPages?.['400']} />} />
              <Route path="/401" element={<ErrorPage code={401} message={config?.errorPages?.['401']} />} />
              <Route path="/403" element={<ErrorPage code={403} message={config?.errorPages?.['403']} />} />
              <Route path="/404" element={<ErrorPage code={404} message={config?.errorPages?.['404']} />} />
              <Route path="/503" element={<ErrorPage code={503} message={config?.errorPages?.['503']} />} />
              
              <Route path="/:slug" element={<RedirectPage config={config} />} />
              <Route path="*" element={<ErrorPage code={404} message={config?.errorPages?.['404']} />} />
            </Routes>
          </BrowserRouter>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
