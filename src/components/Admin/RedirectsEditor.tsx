import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Copy, ExternalLink, Check, AlertCircle, Edit2, 
  Link2, FileText, X, Search, Save, Sparkles, HelpCircle 
} from 'lucide-react';

interface RedirectsEditorProps {
  config: any;
  updateField: (path: string[], value: any) => void;
}

interface RedirectItem {
  slug: string;
  url: string;
  description?: string;
}

const RESERVED_SLUGS = [
  'admin', 'login', 'download', '400', '401', '403', '404', '503', 'files', 'api'
];

export const RedirectsEditor: React.FC<RedirectsEditorProps> = ({ config, updateField }) => {
  const redirects: RedirectItem[] = config?.redirects || [];

  // Form State
  const [slug, setSlug] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSlug, setEditSlug] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Copy Feedback State
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Normalize slug in real-time
  const handleSlugChange = (val: string, isEdit: boolean = false) => {
    // lowercase, replace spaces with hyphens, filter letters/numbers/hyphens/underscores
    const normalized = val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    
    if (isEdit) {
      setEditSlug(normalized);
      setEditError(null);
    } else {
      setSlug(normalized);
      setError(null);
    }
  };

  const validateSlug = (testSlug: string, currentIndex: number | null = null): string | null => {
    if (!testSlug) {
      return 'Slug is required.';
    }
    if (RESERVED_SLUGS.includes(testSlug)) {
      return `"${testSlug}" is a reserved system path and cannot be used as a short link.`;
    }
    
    // Check for duplicates
    const duplicate = redirects.some(
      (item, idx) => item.slug.toLowerCase() === testSlug.toLowerCase() && idx !== currentIndex
    );
    if (duplicate) {
      return `A redirect with the slug "/${testSlug}" already exists.`;
    }

    return null;
  };

  const handleAddRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanSlug = slug.trim();
    let cleanUrl = url.trim();

    const slugErr = validateSlug(cleanSlug);
    if (slugErr) {
      setError(slugErr);
      return;
    }

    if (!cleanUrl) {
      setError('Target URL is required.');
      return;
    }

    // Auto prepend protocol if missing
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Attempt simple URL format validation
    try {
      new URL(cleanUrl);
    } catch (_) {
      setError('Please enter a valid target URL.');
      return;
    }

    const newItem: RedirectItem = {
      slug: cleanSlug,
      url: cleanUrl,
      description: description.trim()
    };

    const updated = [...redirects, newItem];
    updateField(['redirects'], updated);

    // Reset Form
    setSlug('');
    setUrl('');
    setDescription('');
  };

  const handleStartEdit = (index: number, item: RedirectItem) => {
    setEditingIndex(index);
    setEditSlug(item.slug);
    setEditUrl(item.url);
    setEditDescription(item.description || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditError(null);
  };

  const handleSaveEdit = (index: number) => {
    setEditError(null);

    const cleanSlug = editSlug.trim();
    let cleanUrl = editUrl.trim();

    const slugErr = validateSlug(cleanSlug, index);
    if (slugErr) {
      setEditError(slugErr);
      return;
    }

    if (!cleanUrl) {
      setEditError('Target URL is required.');
      return;
    }

    // Auto prepend protocol if missing
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch (_) {
      setEditError('Please enter a valid target URL.');
      return;
    }

    const updated = [...redirects];
    updated[index] = {
      slug: cleanSlug,
      url: cleanUrl,
      description: editDescription.trim()
    };

    updateField(['redirects'], updated);
    setEditingIndex(null);
  };

  const handleDeleteRedirect = (index: number) => {
    const item = redirects[index];
    if (window.confirm(`Are you sure you want to delete the redirect for "/${item.slug}"?`)) {
      const updated = redirects.filter((_, i) => i !== index);
      updateField(['redirects'], updated);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  const handleCopyLink = (itemSlug: string) => {
    const fullLink = `${window.location.origin}/${itemSlug}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedSlug(itemSlug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Filter redirects based on search
  const filteredRedirects = redirects.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.slug.toLowerCase().includes(searchLower) ||
      item.url.toLowerCase().includes(searchLower) ||
      (item.description || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8">
      {/* Add New Redirect Section */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Plus size={20} /> Create New Short URL
          </h3>
          <p className="text-xs text-neutral-400 font-medium mt-1">Configure a slug and where it should forward visitors.</p>
        </div>

        <form onSubmit={handleAddRedirect} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slug input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1">
                Short Slug <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-sm font-bold text-neutral-400 font-mono select-none">
                  /
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="discord"
                  required
                  className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                />
              </div>
            </div>

            {/* Target URL input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1">
                Target URL <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <Link2 size={14} className="absolute left-4 text-neutral-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="discord.gg/invite-code"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                />
              </div>
            </div>

            {/* Description Input */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                Internal Note / Description
              </label>
              <div className="relative flex items-center">
                <FileText size={14} className="absolute left-4 text-neutral-400" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. For YouTube streaming promos"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl flex items-start gap-2.5 text-xs font-bold"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95"
            >
              Add Link
            </button>
          </div>
        </form>
      </div>

      {/* Redirects Listing Section */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Existing Short Links</h3>
            <p className="text-xs text-neutral-400 font-medium mt-1">
              Active redirects list ({redirects.length} total)
            </p>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search links..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border-2 border-neutral-100 rounded-xl focus:border-black transition-colors font-bold outline-none text-xs"
            />
          </div>
        </div>

        {filteredRedirects.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
            <div className="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center border-2 border-neutral-100 mx-auto mb-4">
              <Link2 size={24} />
            </div>
            <h4 className="text-base font-black uppercase tracking-wider text-neutral-800">
              {searchTerm ? 'No matching links found' : 'No short links created'}
            </h4>
            <p className="text-neutral-400 text-sm font-medium mt-1 italic">
              {searchTerm ? 'Try searching for something else.' : 'Your created redirects will be listed here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRedirects.map((item, index) => {
              // Find index in original redirects array
              const originalIndex = redirects.findIndex(r => r.slug === item.slug);
              const isEditing = editingIndex === originalIndex;

              return (
                <div 
                  key={item.slug}
                  className={`p-5 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 bg-white border-neutral-100 hover:border-neutral-300`}
                >
                  {isEditing ? (
                    /* Editing Form Panel */
                    <div className="space-y-4 w-full">
                      <div className="flex justify-between items-center border-b-2 border-neutral-100 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Editing link: /{item.slug}</span>
                        <button onClick={handleCancelEdit} className="p-1 hover:bg-neutral-100 rounded">
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Slug */}
                        <div className="space-y-1">
                          <label className="font-black uppercase text-neutral-400 tracking-wider">Slug Path</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-neutral-400 font-mono font-bold">/</span>
                            <input
                              type="text"
                              value={editSlug}
                              onChange={(e) => handleSlugChange(e.target.value, true)}
                              className="w-full pl-6 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:border-black outline-none font-bold"
                            />
                          </div>
                        </div>

                        {/* URL */}
                        <div className="space-y-1">
                          <label className="font-black uppercase text-neutral-400 tracking-wider">Target URL</label>
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:border-black outline-none font-bold"
                          />
                        </div>

                        {/* Description */}
                        <div className="col-span-1 md:col-span-2 space-y-1">
                          <label className="font-black uppercase text-neutral-400 tracking-wider">Description</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:border-black outline-none font-bold"
                          />
                        </div>
                      </div>

                      {editError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-xs font-bold">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 text-neutral-600 bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(originalIndex)}
                          className="px-4 py-2 bg-black text-white border border-black rounded-lg text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only list item layout */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Slug Display */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-black select-all px-2 py-0.5 bg-neutral-100 rounded-md border border-neutral-200">
                            /{item.slug}
                          </span>
                          {item.description && (
                            <span className="text-xs text-neutral-400 font-medium truncate max-w-[150px] sm:max-w-[250px]">
                              • {item.description}
                            </span>
                          )}
                        </div>

                        {/* Destination Display */}
                        <div className="flex items-center gap-1 text-xs text-neutral-500 font-medium">
                          <span className="shrink-0">Forwards to:</span>
                          <span className="font-mono text-black truncate select-all bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded text-[11px]">
                            {item.url}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item.slug)}
                          title="Copy Full Short URL"
                          className="p-2 border border-neutral-200 text-neutral-500 hover:text-black hover:bg-neutral-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                        >
                          {copiedSlug === item.slug ? (
                            <>
                              <Check size={14} className="text-green-600" />
                              <span className="text-green-600 font-bold text-[10px]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>

                        {/* Test Redirection Button */}
                        <a
                          href={`/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Test short link"
                          className="p-2 border border-neutral-200 text-neutral-500 hover:text-black hover:bg-neutral-50 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                        >
                          <ExternalLink size={14} />
                          <span className="text-[10px]">Test</span>
                        </a>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(originalIndex, item)}
                          title="Edit Redirect"
                          className="p-2 hover:bg-neutral-50 hover:text-black text-neutral-400 border border-transparent hover:border-neutral-200 rounded-xl transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRedirect(originalIndex)}
                          title="Delete Redirect"
                          className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
