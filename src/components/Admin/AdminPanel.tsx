import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { fetchSettings, subscribeToSettings, updateSettings } from '../../services/configService';
import { INITIAL_CONFIG, EXAMPLE_CONFIG } from '../../constants';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, LogOut, Settings, User, Hash, Globe, Calendar, Heart, Folder,
  List, Code, Gamepad2, Quote, Image as ImageIcon, Layout, 
  ExternalLink, Mail, Send, Type, Sparkles, ChevronRight,
  Plus, Trash2, Eye, Upload, X, ShieldAlert, Home, ChevronUp, ChevronDown, GripVertical, Lock, Copy, File as FileIcon, Check,
  Inbox, MailOpen, Users, Database, UserCheck
} from 'lucide-react';
import { authService } from '../../services/authService';
import { AdminsManager } from './AdminsManager';
import { DatabaseConfigEditor } from './DatabaseConfigEditor';
import { AccountSettingsEditor } from './AccountSettingsEditor';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Turnstile } from '@marsidev/react-turnstile';

const MarkdownField = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  const insertText = (before: string, after: string = "") => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const text = value;
    const selected = text.substring(selectionStart, selectionEnd);
    const newText = text.substring(0, selectionStart) + before + selected + after + text.substring(selectionEnd);
    onChange(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          selectionStart + before.length,
          selectionEnd + before.length
        );
      }
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{label}</label>
        <div className="flex items-center gap-2">
          {!showPreview && (
            <div className="flex bg-neutral-100 rounded-md p-0.5 relative group/toolbar overflow-visible">
              <button title="Bold" type="button" onClick={() => insertText("**", "**")} className="px-2 py-0.5 text-[10px] font-bold hover:bg-white rounded">B</button>
              <button title="Italic" type="button" onClick={() => insertText("*", "*")} className="px-2 py-0.5 text-[10px] italic hover:bg-white rounded">I</button>
              <button title="Underline" type="button" onClick={() => insertText("<u>", "</u>")} className="px-2 py-0.5 text-[10px] underline hover:bg-white rounded">U</button>
              <button title="Red Text" type="button" onClick={() => insertText('<span style="color: #ff0000">', "</span>")} className="px-2 py-0.5 text-[10px] hover:bg-white rounded text-red-500">A</button>
              <button title="Click to Copy Text" type="button" onClick={() => insertText("<kbd>", "</kbd>")} className="px-2 py-0.5 text-[10px] hover:bg-white rounded flex items-center justify-center text-neutral-500"><Copy size={10} /></button>
            </div>
          )}
          <button 
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-black bg-neutral-100 px-2 py-1 rounded-md transition-colors hover:bg-neutral-200"
          >
            {showPreview ? <Code size={10} /> : <Eye size={10} />}
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>
      
      {showPreview ? (
        <div className="p-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl min-h-[100px] prose prose-sm max-w-none prose-p:m-0 prose-headings:text-inherit prose-headings:m-0">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{value}</Markdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full p-4 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm resize-none"
        />
      )}
    </div>
  );
};

const ImageUpload = ({ label, value, onChange, icon: Icon }: { label: string, value: string, onChange: (val: string) => void, icon?: any }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
        {Icon && <Icon size={12} />} {label}
      </label>
      
      <div className="flex gap-3 items-center">
        {value && (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-neutral-200 shrink-0 relative group bg-neutral-100">
            {value.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ? (
              <img src={value} alt="preview" className="w-full h-full object-cover" />
            ) : value.startsWith('data:') ? (
              <img src={value} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                <FileIcon size={20} className="text-neutral-400" />
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder="Enter file URL or use picker..."
              value={value.startsWith('data:') ? 'Base64 Image' : value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full sm:flex-1 p-2 bg-white border border-neutral-200 rounded-lg text-[10px] sm:text-xs font-mono outline-none focus:border-black transition-colors min-w-0"
            />
            <div className="flex gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex-1 sm:flex-none px-3 py-2 bg-black text-white rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap hover:scale-105 transition-transform flex items-center justify-center gap-1"
              >
                <Folder size={14} /> Select File
              </button>
              {value && (
                <button 
                  type="button"
                  onClick={() => onChange('')}
                  className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 sm:p-8"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden border-4 border-black relative"
            >
              <div className="p-4 border-b-2 border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Folder size={20} /> Select File
                </h3>
                <button onClick={() => setPickerOpen(false)} className="p-2 hover:bg-neutral-200 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <FileManager 
                  pickerMode 
                  onSelect={(file) => {
                    onChange(`/files${file.path}`);
                    setPickerOpen(false);
                  }} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TurnstileTester = ({ siteKey }: { siteKey: string }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testKey, setTestKey] = useState(0);

  const handleTest = () => {
    if (!siteKey) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }
    setTestKey(k => k + 1);
    setStatus('loading');
    setTimeout(() => {
      setStatus(s => s === 'loading' ? 'error' : s);
      setTimeout(() => setStatus('idle'), 3000);
    }, 5000); // 5 sec timeout
  };

  return (
    <>
      <button
        onClick={handleTest}
        className={`px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 min-w-[100px] ${
          status === 'idle' ? 'bg-black text-white hover:bg-neutral-800' :
          status === 'loading' ? 'bg-neutral-200 text-neutral-600' :
          status === 'success' ? 'bg-green-500 text-white' :
          'bg-red-500 text-white'
        }`}
      >
        {status === 'idle' && 'Test'}
        {status === 'loading' && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {status === 'success' && <Check size={14} />}
        {status === 'error' && <X size={14} />}
      </button>

      {status === 'loading' && (
        <div className="absolute opacity-0 pointer-events-none">
          <Turnstile
            key={testKey}
            siteKey={siteKey}
            onLoad={() => {
              setStatus('success');
              setTimeout(() => setStatus('idle'), 3000);
            }}
            onError={() => {
              setStatus('error');
              setTimeout(() => setStatus('idle'), 3000);
            }}
          />
        </div>
      )}
    </>
  );
};

const GoogleAdsTester = ({ clientId }: { clientId: string }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleTest = () => {
    setStatus('loading');
    setTimeout(() => {
      const isValid = /^ca-pub-\d{16}$/.test(clientId);
      setStatus(isValid ? 'success' : 'error');
      setTimeout(() => setStatus('idle'), 3000);
    }, 600);
  };

  return (
    <button
      onClick={handleTest}
      className={`px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 min-w-[100px] ${
        status === 'idle' ? 'bg-black text-white hover:bg-neutral-800' :
        status === 'loading' ? 'bg-neutral-200 text-neutral-600' :
        status === 'success' ? 'bg-green-500 text-white' :
        'bg-red-500 text-white'
      }`}
    >
      {status === 'idle' && 'Test'}
      {status === 'loading' && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {status === 'success' && <Check size={14} />}
      {status === 'error' && <X size={14} />}
    </button>
  );
};

type AdminSection = 'main' | 'persona' | 'collections' | 'contact' | 'donations' | 'quotes' | 'errors' | 'files' | 'configs' | 'messages' | 'redirects' | 'admins' | 'database' | 'account';

import { FileManager } from './FileManager';
import { RedirectsEditor } from './RedirectsEditor';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('main');
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [config, setConfig] = useState<any>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadSettings = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          navigate('/admin/login');
          return;
        }
        setAdminUser(user);

        const data = await fetchSettings();
        if (data) {
          setConfig((prev: any) => {
            const merged = { ...prev, ...data };
            merged.donations = {
              ...INITIAL_CONFIG.donations,
              ...(data.donations || {})
            };
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to load admin panel:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndLoadSettings();
  }, []);

  useEffect(() => {
    const messagesQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : new Date()
        };
      });
      setInboxMessages(msgs);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error subscribing to messages: ", error);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, []);

  const handleViewMessage = async (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      try {
        await updateDoc(doc(db, 'messages', msg.id), { read: true });
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    }
  };

  const handleDeleteMessage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const executeDeleteMessage = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'messages', deleteConfirmId));
      if (selectedMessage?.id === deleteConfirmId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleReadStatus = async (msg: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'messages', msg.id), { read: !msg.read });
    } catch (err) {
      console.error("Failed to toggle read status:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateSettings(config);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev };
      let current = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  const addItem = (section: string) => {
    const newItem = { banner: "", profile: "", title: "", description: "", link: "" };
    const list = [...(config[section] || [])];
    list.push(newItem);
    updateField([section], list);
  };

  const removeItem = (section: string, index: number) => {
    const list = config[section].filter((_: any, i: number) => i !== index);
    updateField([section], list);
  };

  const moveItem = (section: string, index: number, direction: number) => {
    const list = [...(config[section] || [])];
    if (index + direction >= 0 && index + direction < list.length) {
      const temp = list[index];
      list[index] = list[index + direction];
      list[index + direction] = temp;
      updateField([section], list);
    }
  };

  const onDragEnd = (result: any, type: string) => {
    if (!result.destination) return;
    const list = [...(config[type] || [])];
    const [removed] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, removed);
    updateField([type], list);
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: AdminSection, label: string, icon: any }) => {
    const unreadCount = id === 'messages' ? inboxMessages.filter((m: any) => !m.read).length : 0;
    return (
      <button
        onClick={() => setActiveSection(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm uppercase tracking-wider relative ${ activeSection === id ? 'bg-black text-white scale-[1.02]' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600' }`}
      >
        <Icon size={18} />
        <span>{label}</span>
        {unreadCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-black flex items-center justify-center min-w-[18px] animate-pulse">
            {unreadCount}
          </span>
        )}
        {activeSection === id && <ChevronRight size={16} className="ml-auto" />}
      </button>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-neutral-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 md:h-full shrink-0 bg-white border-r-2 border-neutral-100 p-6 flex flex-col gap-8 md:overflow-y-auto">
        <div className="flex items-center gap-3 bg-black text-white p-4 rounded-2xl shrink-0">
          <Settings className="animate-spin-slow" />
          <h1 className="text-sm font-black uppercase tracking-widest">Admin Panel</h1>
        </div>

        <div className="px-1">
          <div className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-100 mb-4">
            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Status: Active</p>
            <h3 className="text-lg font-black text-black">Hi {adminUser?.username || 'Admin'}! 👋</h3>
          </div>

          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-black rounded-xl hover:bg-black hover:text-white transition-all font-black text-xs uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Home size={16} />
            Enter Main Page
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <SidebarItem id="main" label="Main Page" icon={Layout} />
          <SidebarItem id="persona" label="Profile ID" icon={User} />
          <SidebarItem id="files" label="File Manager" icon={Folder} />
          <SidebarItem id="donations" label="Donations" icon={Heart} />
          <SidebarItem id="contact" label="Contact" icon={Mail} />
          <SidebarItem id="messages" label="Inbox Messages" icon={Inbox} />
          <SidebarItem id="redirects" label="Direct Links" icon={ExternalLink} />
          <SidebarItem id="collections" label="Explore Sections" icon={Sparkles} />
          <SidebarItem id="quotes" label="Quotes" icon={Quote} />
          <SidebarItem id="errors" label="Error Pages" icon={ShieldAlert} />
          <SidebarItem id="configs" label="Configs" icon={Settings} />
          <SidebarItem id="admins" label="Administrators" icon={Users} />
          <SidebarItem id="database" label="Database Config" icon={Database} />
          <SidebarItem id="account" label="Account Settings" icon={UserCheck} />
        </nav>

        <button 
          onClick={() => {
            authService.removeToken();
            navigate('/admin/login');
          }}
          className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-xs font-black uppercase tracking-widest mt-auto"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto pb-20 md:pb-0">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 mb-8 rounded-2xl border-2 flex items-center gap-3 font-bold text-sm ${ message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700' }`}
            >
              <div className={`w-2 h-2 rounded-full animate-pulse ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              {message.text}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* --- MAIN PAGE SECTION --- */}
              {activeSection === 'main' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Main Page Config</h2>
                    <p className="text-neutral-400 text-sm font-medium">Hero elements and landing identity.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-6">
                    <MarkdownField 
                      label="Hero Title (Markdown Support)" 
                      value={config.mainPage?.title || ""} 
                      onChange={(val) => updateField(['mainPage', 'title'], val)}
                      placeholder="e.g. **SHIVAM** @TANGY"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ImageUpload 
                        label="Profile Picture"
                        icon={ImageIcon}
                        value={config.mainPage?.pfp || ""}
                        onChange={(val) => updateField(['mainPage', 'pfp'], val)}
                      />
                      <ImageUpload 
                        label="Banner Image"
                        icon={Layout}
                        value={config.mainPage?.banner || ""}
                        onChange={(val) => updateField(['mainPage', 'banner'], val)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- FILES SECTION --- */}
              {activeSection === 'files' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">File Manager</h2>
                    <p className="text-neutral-400 text-sm font-medium">Manage files, documents, and media.</p>
                  </header>
                  <FileManager />
                </div>
              )}

              {/* --- PERSONA SECTION --- */}
              {activeSection === 'persona' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Profile ID Card</h2>
                    <p className="text-neutral-400 text-sm font-medium">Your digital identity metadata.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Name</label>
                        <input 
                          type="text" 
                          value={config.profileConfig?.name || ""} 
                          onChange={(e) => updateField(['profileConfig', 'name'], e.target.value)}
                          placeholder={`e.g. ${EXAMPLE_CONFIG.profileConfig.name}`}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">System ID</label>
                        <input 
                          type="text" 
                          value={config.profileConfig?.systemId || ""} 
                          onChange={(e) => updateField(['profileConfig', 'systemId'], e.target.value)}
                          placeholder={`e.g. ${EXAMPLE_CONFIG.profileConfig.systemId}`}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Country</label>
                        <input 
                          type="text" 
                          value={config.profileConfig?.country || ""} 
                          onChange={(e) => updateField(['profileConfig', 'country'], e.target.value)}
                          placeholder={`e.g. ${EXAMPLE_CONFIG.profileConfig.country}`}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Birth Date</label>
                        <input 
                          type="date" 
                          value={config.profileConfig?.birthDate || ""} 
                          onChange={(e) => updateField(['profileConfig', 'birthDate'], e.target.value)}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Relationship Status</label>
                      <input 
                        type="text" 
                        value={config.profileConfig?.status || ""} 
                        onChange={(e) => updateField(['profileConfig', 'status'], e.target.value)}
                        placeholder={`e.g. ${EXAMPLE_CONFIG.profileConfig.status}`}
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Footer Quote</label>
                      <input 
                        type="text" 
                        value={config.profileConfig?.footerQuote || ""} 
                        onChange={(e) => updateField(['profileConfig', 'footerQuote'], e.target.value)}
                        placeholder={`e.g. ${EXAMPLE_CONFIG.profileConfig.footerQuote}`}
                        className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                      
                      <div className="space-y-4">
                        <MarkdownField 
                          label="Interests"
                          value={config.profileConfig?.interests || ""} 
                          onChange={(val) => updateField(['profileConfig', 'interests'], val)}
                          placeholder={`e.g.\n${EXAMPLE_CONFIG.profileConfig.interests}`}
                        />
                        <MarkdownField 
                          label="Skills"
                          value={config.profileConfig?.skills || ""} 
                          onChange={(val) => updateField(['profileConfig', 'skills'], val)}
                          placeholder={`e.g.\n${EXAMPLE_CONFIG.profileConfig.skills}`}
                        />
                        <MarkdownField 
                          label="Games"
                          value={config.profileConfig?.games || ""} 
                          onChange={(val) => updateField(['profileConfig', 'games'], val)}
                          placeholder={`e.g.\n${EXAMPLE_CONFIG.profileConfig.games}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- COLLECTIONS SECTION --- */}
              {activeSection === 'collections' && (
                <div className="space-y-8">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Explore Sections</h2>
                    <p className="text-neutral-400 text-sm font-medium">Manage setup, projects, communities, referrals, and links.</p>
                  </header>

                  {(['setup', 'projects', 'communities', 'referrals', 'links'] as const).map((type) => (
                    <div key={type} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase tracking-tight">{type}</h3>
                        <button 
                          onClick={() => addItem(type)}
                          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                          <Plus size={14} /> Add New
                        </button>
                      </div>

                      <DragDropContext onDragEnd={(result) => onDragEnd(result, type)}>
                        <Droppable droppableId={`list-${type}`}>
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                              {config[type]?.map((item: any, i: number) => (
                                <Draggable key={`${type}-${i}`} draggableId={`${type}-${i}`} index={i}>
                                  {(provided) => (
                                    <div 
                                      ref={provided.innerRef} 
                                      {...provided.draggableProps} 
                                      className="bg-white border-2 border-black rounded-3xl p-6 relative overflow-hidden flex flex-col gap-4"
                                    >
                                      <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-4 mb-2">
                                        <div className="flex items-center gap-3">
                                          <div 
                                            {...provided.dragHandleProps} 
                                            className="p-2 bg-neutral-50 text-neutral-400 rounded-lg cursor-grab active:cursor-grabbing hover:bg-neutral-100 hover:text-black border border-neutral-200"
                                          >
                                            <GripVertical size={16} />
                                          </div>
                                          <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Item {i + 1}</span>
                                        </div>
                                        <div className="flex items-center gap-2 relative z-10 bg-white">
                                          <button 
                                            onClick={() => moveItem(type, i, -1)}
                                            disabled={i === 0}
                                            className="p-2 bg-neutral-50 text-neutral-500 rounded-lg hover:bg-neutral-200 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-200"
                                          >
                                            <ChevronUp size={16} />
                                          </button>
                                          <button 
                                            onClick={() => moveItem(type, i, 1)}
                                            disabled={i === config[type].length - 1}
                                            className="p-2 bg-neutral-50 text-neutral-500 rounded-lg hover:bg-neutral-200 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-200"
                                          >
                                            <ChevronDown size={16} />
                                          </button>
                                          <button 
                                            onClick={() => removeItem(type, i)}
                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-100"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                          <MarkdownField 
                                            label="Title"
                                            value={item.title} 
                                            onChange={(val) => {
                                              const list = [...config[type]];
                                              list[i] = { ...list[i], title: val };
                                              updateField([type], list);
                                            }}
                                          />
                                          <MarkdownField 
                                            label="Description"
                                            value={item.description}
                                            onChange={(val) => {
                                              const list = [...config[type]];
                                              list[i] = { ...list[i], description: val };
                                              updateField([type], list);
                                            }}
                                          />
                                          <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                                            <ExternalLink size={14} className="text-neutral-400" />
                                            <input 
                                              placeholder="Link URL"
                                              value={item.link}
                                              onChange={(e) => {
                                                const list = [...config[type]];
                                                list[i] = { ...list[i], link: e.target.value };
                                                updateField([type], list);
                                              }}
                                              className="bg-transparent outline-none flex-grow text-xs font-mono"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          <ImageUpload 
                                            label="Banner Image"
                                            value={item.banner}
                                            onChange={(val) => {
                                              const list = [...config[type]];
                                              list[i] = { ...list[i], banner: val };
                                              updateField([type], list);
                                            }}
                                          />
                                          <ImageUpload 
                                            label="Profile/Icon Image"
                                            value={item.profile}
                                            onChange={(val) => {
                                              const list = [...config[type]];
                                              list[i] = { ...list[i], profile: val };
                                              updateField([type], list);
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  ))}
                </div>
              )}

              {/* --- CONTACT SECTION --- */}
              {activeSection === 'contact' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Contact Config</h2>
                    <p className="text-neutral-400 text-sm font-medium">How people can reach you.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                          <Mail size={12} /> Email (Protected by Captcha)
                        </label>
                        <input 
                          type="email" 
                          value={config.contact?.email || ""} 
                          onChange={(e) => updateField(['contact', 'email'], e.target.value)}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                          <Send size={12} /> Telegram Handle
                        </label>
                        <input 
                          type="text" 
                          value={config.contact?.telegram || ""} 
                          onChange={(e) => updateField(['contact', 'telegram'], e.target.value)}
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                      </div>
                    </div>

                    <MarkdownField 
                      label="Contact Description"
                      value={config.contact?.description || ""}
                      onChange={(val) => updateField(['contact', 'description'], val)}
                      placeholder="e.g. Reach out for collaborations..."
                    />
                  </div>
                </div>
              )}

              {/* --- DONATIONS SECTION --- */}
              {activeSection === 'donations' && (
                <div className="space-y-8">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Donations Config</h2>
                    <p className="text-neutral-400 text-sm font-medium">Manage crypto addresses and support links.</p>
                  </header>

                  {/* Crypto Methods */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-tight">Crypto Settings</h3>

                    <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-4">
                      <MarkdownField 
                        label="Crypto Box Description"
                        value={config.donations?.cryptoDescription || ""} 
                        onChange={(val) => updateField(['donations', 'cryptoDescription'], val)}
                        placeholder="A short message for your crypto donors..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <h4 className="text-sm font-black uppercase text-neutral-500 tracking-widest">Networks</h4>
                      <button 
                        onClick={() => {
                          const list = [...(config.donations?.crypto || [])];
                          list.push({ network: "", address: "", qrCode: "" });
                          updateField(['donations', 'crypto'], list);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                        <Plus size={14} /> Add Network
                      </button>
                    </div>

                    <div className="space-y-6">
                      {config.donations?.crypto?.map((crypto: any, i: number) => (
                        <div key={i} className="bg-white border-2 border-black rounded-3xl p-6 relative group">
                          <button 
                            onClick={() => {
                              const list = config.donations.crypto.filter((_: any, idx: number) => idx !== i);
                              updateField(['donations', 'crypto'], list);
                            }}
                            className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Network Name</label>
                                <input 
                                  placeholder="e.g. Ethereum (ERC20)"
                                  value={crypto.network}
                                  onChange={(e) => {
                                    const list = [...(config.donations?.crypto || [])];
                                    list[i] = { ...list[i], network: e.target.value };
                                    updateField(['donations', 'crypto'], list);
                                  }}
                                  className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Wallet Address</label>
                                <input 
                                  placeholder="0x..."
                                  value={crypto.address}
                                  onChange={(e) => {
                                    const list = [...(config.donations?.crypto || [])];
                                    list[i] = { ...list[i], address: e.target.value };
                                    updateField(['donations', 'crypto'], list);
                                  }}
                                  className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-[10px] font-mono"
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Preview QR (Auto-generated)</label>
                              <div className="bg-neutral-50 border-2 border-neutral-100 rounded-xl p-4 flex items-center justify-center">
                                {crypto.address ? (
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(crypto.address)}`} 
                                    alt="QR Preview" 
                                    className="w-24 h-24 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="text-[10px] uppercase font-black text-neutral-300">Enter address to preview</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Local Methods */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-tight">Local Methods (Mauritius Only)</h3>

                    <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-4">
                      <MarkdownField 
                        label="Local Methods Description"
                        value={config.donations?.localMethodsDescription || ""} 
                        onChange={(val) => updateField(['donations', 'localMethodsDescription'], val)}
                        placeholder="A short message for your local donors..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <h4 className="text-sm font-black uppercase text-neutral-500 tracking-widest">Providers</h4>
                      <button 
                        onClick={() => {
                          const list = [...(config.donations?.localMethods || [])];
                          list.push({ provider: "", qrCode: "" });
                          updateField(['donations', 'localMethods'], list);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                        <Plus size={14} /> Add Provider
                      </button>
                    </div>

                    <div className="space-y-6">
                      {config.donations?.localMethods?.map((local: any, i: number) => (
                        <div key={i} className="bg-white border-2 border-black rounded-3xl p-6 relative group">
                          <button 
                            onClick={() => {
                              const list = (config.donations?.localMethods || []).filter((_: any, idx: number) => idx !== i);
                              updateField(['donations', 'localMethods'], list);
                            }}
                            className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Provider Name</label>
                                <input 
                                  placeholder="e.g. MCB Juice"
                                  value={local.provider}
                                  onChange={(e) => {
                                    const list = [...(config.donations?.localMethods || [])];
                                    list[i] = { ...list[i], provider: e.target.value };
                                    updateField(['donations', 'localMethods'], list);
                                  }}
                                  className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Address / Phone / Pay Code</label>
                                <input 
                                  placeholder="e.g. 51234567"
                                  value={local.address || ''}
                                  onChange={(e) => {
                                    const list = [...(config.donations?.localMethods || [])];
                                    list[i] = { ...list[i], address: e.target.value };
                                    updateField(['donations', 'localMethods'], list);
                                  }}
                                  className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Preview QR (Auto-generated)</label>
                              <div className="bg-neutral-50 border-2 border-neutral-100 rounded-xl p-4 flex items-center justify-center">
                                {local.address ? (
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(local.address)}`} 
                                    alt="QR Preview" 
                                    className="w-24 h-24 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="text-[10px] uppercase text-center font-black text-neutral-300">Enter address to preview</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other Ways */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-tight">Other Support Links</h3>
                    <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-6">
                      <div className="space-y-4">
                        {(Array.isArray(config.donations?.other) ? config.donations.other : []).map((link: any, i: number) => (
                          <div key={i} className="flex flex-col gap-4 items-start bg-neutral-50 p-4 border border-neutral-100 rounded-xl relative group">
                            <button 
                              onClick={() => {
                                const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                list.splice(i, 1);
                                updateField(['donations', 'other'], list);
                              }}
                              className="absolute -top-3 -right-3 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 hover:text-red-700"
                              title="Remove link"
                            >
                              <Trash2 size={14} />
                            </button>
                            
                            <div className="flex flex-col gap-4 w-full">
                              <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <div className="space-y-2 flex-grow w-full sm:w-1/3">
                                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Icon Class</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. fa-brands fa-paypal"
                                    value={link.icon || ''}
                                    onChange={(e) => {
                                      const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                      list[i] = { ...list[i], icon: e.target.value };
                                      updateField(['donations', 'other'], list);
                                    }}
                                    className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs font-mono"
                                  />
                                </div>
                                <div className="space-y-2 flex-grow w-full sm:w-1/3">
                                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Title</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. PayPal"
                                    value={link.title || ''}
                                    onChange={(e) => {
                                      const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                      list[i] = { ...list[i], title: e.target.value };
                                      updateField(['donations', 'other'], list);
                                    }}
                                    className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                                  />
                                </div>
                                <div className="space-y-2 flex-grow w-full sm:w-1/3">
                                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Type</label>
                                  <select 
                                    value={link.type || 'url'}
                                    onChange={(e) => {
                                      const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                      list[i] = { ...list[i], type: e.target.value };
                                      updateField(['donations', 'other'], list);
                                    }}
                                    className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                                  >
                                    <option value="url">Direct URL</option>
                                    <option value="popup">Pop-up Menu</option>
                                  </select>
                                </div>
                              </div>
                              
                              {(!link.type || link.type === 'url') ? (
                                <div className="space-y-2 w-full">
                                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">URL</label>
                                  <input 
                                    type="text" 
                                    placeholder="https://"
                                    value={link.url || ''}
                                    onChange={(e) => {
                                      const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                      list[i] = { ...list[i], url: e.target.value };
                                      updateField(['donations', 'other'], list);
                                    }}
                                    className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs font-mono"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-4 w-full bg-neutral-50 p-4 border border-neutral-100 rounded-xl">
                                  <div className="flex-grow w-full sm:w-1/2">
                                    <MarkdownField 
                                      label="Pop-up Description"
                                      value={link.popupDescription || ''}
                                      onChange={(val) => {
                                        const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                        list[i] = { ...list[i], popupDescription: val };
                                        updateField(['donations', 'other'], list);
                                      }}
                                      placeholder="Description to show in popup..."
                                    />
                                  </div>
                                  <div className="flex flex-col gap-4 flex-grow w-full sm:w-1/2">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Button Link</label>
                                      <input 
                                        type="text" 
                                        placeholder="https://"
                                        value={link.popupUrl || ''}
                                        onChange={(e) => {
                                          const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                          list[i] = { ...list[i], popupUrl: e.target.value };
                                          updateField(['donations', 'other'], list);
                                        }}
                                        className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs font-mono"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Button Text</label>
                                      <input 
                                        type="text" 
                                        placeholder="e.g. Visit Link"
                                        value={link.popupButtonText || ''}
                                        onChange={(e) => {
                                          const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                                          list[i] = { ...list[i], popupButtonText: e.target.value };
                                          updateField(['donations', 'other'], list);
                                        }}
                                        className="w-full p-3 bg-white border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <button 
                          onClick={() => {
                            const list = [...(Array.isArray(config.donations?.other) ? config.donations.other : [])];
                            list.push({ icon: 'fa-solid fa-link', title: 'New Link', url: 'https://' });
                            updateField(['donations', 'other'], list);
                          }}
                          className="w-full py-4 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-400 font-bold text-xs uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                        >
                          + Add Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- QUOTES SECTION --- */}
              {activeSection === 'quotes' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Typewriter Quotes</h2>
                    <p className="text-neutral-400 text-sm font-medium">The messages that loop in the header.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Quotes Library</span>
                      <button 
                        onClick={() => updateField(['quotes'], [...(config.quotes || []), ""])}
                        className="p-1.5 bg-black text-white rounded-lg"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {config.quotes?.map((quote: string, i: number) => (
                        <div key={i} className="flex gap-3 group">
                          <div className="flex-grow relative border-2 border-neutral-100 rounded-xl focus-within:border-black transition-colors">
                            <input 
                              value={quote}
                              onChange={(e) => {
                                const list = [...config.quotes];
                                list[i] = e.target.value;
                                updateField(['quotes'], list);
                              }}
                              className="w-full p-4 bg-transparent outline-none font-bold text-sm"
                              placeholder="Enter a fun quote..."
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-300">
                              #{i + 1}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const list = config.quotes.filter((_: any, idx: number) => idx !== i);
                                updateField(['quotes'], list);
                            }}
                            className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                      {(!config.quotes || config.quotes.length === 0) && (
                        <div className="py-12 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                          <p className="text-neutral-400 text-sm font-medium italic">No quotes added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

               {/* --- ERROR PAGES SECTION --- */}
              {activeSection === 'errors' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Error Page Config</h2>
                    <p className="text-neutral-400 text-sm font-medium">Customize the messages shown on error status pages.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-8">
                    {(['400', '401', '403', '404', '503'] as const).map((code) => (
                      <div key={code} className="space-y-3">
                        <MarkdownField 
                          label={`HTTP ${code} Message`}
                          value={config.errorPages?.[code] || ""}
                          onChange={(val) => {
                            const newErrors = { ...(config.errorPages || {}) };
                            newErrors[code] = val;
                            updateField(['errorPages'], newErrors);
                          }}
                          placeholder={`Enter custom message for ${code} error...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- CONFIGS SECTION --- */}
              {activeSection === 'configs' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Global Configs</h2>
                    <p className="text-neutral-400 text-sm font-medium">Manage global configuration items.</p>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                        <Settings size={12} /> Turnstile Site Key
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={config.configs?.turnstileSiteKey || ""} 
                          onChange={(e) => updateField(['configs', 'turnstileSiteKey'], e.target.value)}
                          placeholder="1x00000000000000000000AA"
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                        <TurnstileTester siteKey={config.configs?.turnstileSiteKey || ""} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-2">
                        <Settings size={12} /> Google Ads Client ID
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={config.configs?.googleAdsClient || ""} 
                          onChange={(e) => updateField(['configs', 'googleAdsClient'], e.target.value)}
                          placeholder="ca-pub-1234567890123456"
                          className="w-full p-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none"
                        />
                        <GoogleAdsTester clientId={config.configs?.googleAdsClient || ""} />
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* --- MESSAGES SECTION --- */}
              {activeSection === 'messages' && (
                <div className="space-y-6">
                  <header className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <Inbox size={28} /> Direct Inbox Messages
                      </h2>
                      <p className="text-neutral-400 text-sm font-medium">Read and manage inquiries from your digital business card.</p>
                    </div>
                  </header>

                  <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {loadingMessages ? (
                      <div className="py-20 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : inboxMessages.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                        <div className="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center border-2 border-neutral-100 mx-auto mb-4">
                          <MailOpen size={24} />
                        </div>
                        <h4 className="text-base font-black uppercase tracking-wider text-neutral-800">Inbox is empty</h4>
                        <p className="text-neutral-400 text-sm font-medium italic mt-1">When users send you messages, they'll appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-neutral-100 pb-4 flex-wrap gap-2">
                          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                            Total: {inboxMessages.length} message(s) ({inboxMessages.filter(m => !m.read).length} unread)
                          </span>
                        </div>

                        <div className="divide-y divide-neutral-100 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                          {inboxMessages.map((msg) => (
                            <div 
                              key={msg.id}
                              onClick={() => handleViewMessage(msg)}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group ${
                                !msg.read 
                                  ? 'bg-neutral-50/50 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                                  : 'bg-white border-neutral-100 hover:border-neutral-300'
                              }`}
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                                    !msg.read ? 'bg-red-50 text-red-500 font-bold' : 'bg-neutral-100 text-neutral-500'
                                  }`}>
                                    {!msg.read ? 'New' : 'Read'}
                                  </span>
                                  <h4 className="font-bold text-sm text-neutral-800 truncate max-w-[200px]">{msg.name}</h4>
                                  <span className="text-[10px] font-medium text-neutral-400">&lt;{msg.email}&gt;</span>
                                </div>
                                <h3 className="font-black text-sm text-black truncate">{msg.subject}</h3>
                                <p className="text-neutral-400 text-xs truncate max-w-xl">{msg.message}</p>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {msg.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                
                                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => toggleReadStatus(msg, e)}
                                    title={msg.read ? "Mark as unread" : "Mark as read"}
                                    className="p-2 hover:bg-neutral-100 text-neutral-500 hover:text-black rounded-lg transition-colors border border-transparent hover:border-neutral-200"
                                  >
                                    <MailOpen size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteMessage(msg.id, e)}
                                    title="Delete Message"
                                    className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Detail Modal popup */}
                  <AnimatePresence>
                    {selectedMessage && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedMessage(null)}
                          className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col z-10 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={() => setSelectedMessage(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <X size={20} />
                          </button>

                          <div className="space-y-6">
                            <div className="border-b-2 border-neutral-100 pb-4">
                              <span className="text-[9px] font-black uppercase text-red-500 tracking-widest font-mono">
                                Incoming Message
                              </span>
                              <h3 className="text-xl font-black text-black leading-tight mt-1">{selectedMessage.subject}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-xs">
                              <div>
                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block font-mono">From Name</span>
                                <span className="font-bold text-neutral-800">{selectedMessage.name}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block font-mono">Sent Date</span>
                                <span className="font-mono text-neutral-500">
                                  {selectedMessage.createdAt.toLocaleDateString(undefined, { 
                                    year: 'numeric', month: 'short', day: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block font-mono">From Email</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono font-bold text-neutral-800 break-all select-all">{selectedMessage.email}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(selectedMessage.email)}
                                    className="p-1 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                                    title="Copy Email"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div>
                              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block font-mono mb-2">Message Content</span>
                              <div className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100 min-h-[120px] whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 font-medium">
                                {selectedMessage.message}
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <a
                                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                                className="flex-1 py-3 bg-black text-white hover:bg-neutral-800 rounded-xl text-xs font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 transition-transform active:scale-95 hover:scale-105"
                              >
                                <Send size={14} /> Reply via Email
                              </a>
                              <button
                                onClick={() => handleDeleteMessage(selectedMessage.id)}
                                className="px-5 py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* --- DIRECT LINKS (REDIRECTS) SECTION --- */}
              {activeSection === 'redirects' && (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
                      <ExternalLink size={28} /> Direct Links (Short URLs)
                    </h2>
                    <p className="text-neutral-400 text-sm font-medium">Create short, clean redirects like domain.com/discord that forward visitors automatically.</p>
                  </header>

                  <RedirectsEditor config={config} updateField={updateField} />
                </div>
              )}

              {/* --- ADMINISTRATORS SECTION --- */}
              {activeSection === 'admins' && <AdminsManager />}

              {/* --- DATABASE CONFIG SECTION --- */}
              {activeSection === 'database' && <DatabaseConfigEditor />}

              {/* --- ACCOUNT SETTINGS SECTION --- */}
              {activeSection === 'account' && <AccountSettingsEditor />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Custom Confirmation Modal for Message Deletion */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmId(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-sm border-2 border-black p-6 flex flex-col items-center text-center gap-6 relative z-10 overflow-hidden"
              >
                <div className="p-4 bg-red-50 border-2 border-black rounded-full text-red-500">
                  <ShieldAlert size={36} strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight">Delete Message</h3>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                    Are you sure you want to delete this message? This action is permanent and cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest text-center hover:bg-neutral-100 transition-colors bg-white text-black"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDeleteMessage}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center border-2 border-black hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Save Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="group relative flex items-center justify-center w-20 h-20 md:w-auto md:h-auto md:px-8 md:py-4 bg-black text-white rounded-full hover:scale-110 active:scale-95 transition-all overflow-hidden"
          >
            <div className="relative z-10 flex items-center gap-3">
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={24} />
                  <span className="hidden md:block font-black uppercase tracking-widest text-sm">Save Changes</span>
                </>
              )}
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

