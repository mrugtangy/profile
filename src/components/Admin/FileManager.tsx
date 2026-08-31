import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FileText, File, Image as ImageIcon, Video, Music, Archive,
  Upload, Plus, Trash2, Edit2, Copy, Move, Search, ChevronRight, 
  FolderUp, Save, X, RefreshCw, SortAsc, SortDesc, Code, AlertTriangle, DownloadCloud, Link, CheckCircle2,
  Info, Eye, ZoomIn, ZoomOut, Download, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { auth } from '../../firebase';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
  createdAt: string;
  extension: string;
}

type SortField = 'name' | 'size' | 'updatedAt' | 'extension';
type SortOrder = 'asc' | 'desc';

interface FileManagerProps {
  pickerMode?: boolean;
  onSelect?: (file: FileInfo) => void;
  onClose?: () => void;
}

const isImageFile = (file: FileInfo | { name: string, extension: string }) => {
  const ext = file.extension.toLowerCase();
  return ext.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|ico)$/i) !== null;
};

const getMimeType = (ext: string): string => {
  const cleanExt = ext.toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'avif': 'image/avif',
    'ico': 'image/x-icon',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/x-typescript',
    'json': 'application/json',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'md': 'text/markdown',
    'csv': 'text/csv'
  };
  return mimeMap[cleanExt] || 'application/octet-stream';
};

const TextFilePreview: React.FC<{ path: string; content: string }> = ({ path, content }) => {
  const ext = (path.split('.').pop() || '').toLowerCase();
  
  if (ext === 'md') {
    return (
      <div className="p-6 overflow-y-auto h-full bg-white text-neutral-800">
        <div className="prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-4 [&_h1]:border-b [&_h1]:pb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-neutral-900 [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:pb-2 [&_th]:text-left [&_td]:py-2 [&_td]:border-b">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</Markdown>
        </div>
      </div>
    );
  }

  if (ext === 'html') {
    return (
      <div className="w-full h-full bg-white overflow-auto p-4 border rounded-xl">
        <iframe 
          title="HTML Preview"
          srcDoc={content} 
          sandbox="allow-scripts"
          className="w-full h-full border-0 min-h-[400px] bg-white" 
        />
      </div>
    );
  }

  // Fallback to preformatted code
  return (
    <pre className="p-4 bg-neutral-900 text-neutral-100 font-mono text-xs overflow-auto rounded-xl w-full h-full select-text whitespace-pre-wrap">
      <code>{content}</code>
    </pre>
  );
};

export const FileManager: React.FC<FileManagerProps> = ({ pickerMode, onSelect, onClose }) => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<{ path: string, content: string } | null>(null);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [promptModal, setPromptModal] = useState<{ title: string; value: string; placeholder?: string; onConfirm: (val: string) => void } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ file: string; progress: number } | null>(null);
  const [linkModal, setLinkModal] = useState<{ file: FileInfo } | null>(null);

  // Details, Preview, and Enhanced Upload State
  const [detailsModalFile, setDetailsModalFile] = useState<FileInfo | null>(null);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [unsupportedFileDialog, setUnsupportedFileDialog] = useState<FileInfo | null>(null);

  useEffect(() => {
    const fileForDim = detailsModalFile || previewFile;
    if (fileForDim && !fileForDim.isDirectory && isImageFile(fileForDim)) {
      const img = new Image();
      img.src = `${window.location.origin}/files${fileForDim.path}`;
      img.onload = () => {
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        setImgDimensions(null);
      };
    } else {
      setImgDimensions(null);
    }
    setZoomLevel(1);
  }, [detailsModalFile, previewFile]);

  const closeUploadModal = () => {
    if (!uploadProgress) {
      setUploadModalOpen(false);
      setPendingFiles([]);
    }
  };

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSearching && searchQuery.length > 0) {
      searchFiles(searchQuery);
    } else {
      fetchFiles(currentPath);
    }
  }, [currentPath, isSearching]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchFiles(searchQuery);
    } else {
      setIsSearching(false);
      fetchFiles(currentPath);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    fetchFiles(currentPath);
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === 'name' || sortField === 'extension') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    } else if (sortField === 'updatedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const executeUpload = async (fileList: FileList | File[]) => {
    if (!fileList.length) return;
    setUploadModalOpen(true);
    
    // In picker mode, only allow the first file
    const filesToUpload = pickerMode ? [fileList[0]] : Array.from(fileList);
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadProgress({ file: file.name, progress: 0 });
      
      const formData = new FormData();
      formData.append('files', file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/files/upload?path=${encodeURIComponent(currentPath)}`);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress({ file: file.name, progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) resolve();
          else reject(new Error('Upload failed'));
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    }
    
    setUploadProgress(null);
    setPendingFiles([]);
    setUploadModalOpen(false);
    fetchFiles(currentPath);

    if (pickerMode && filesToUpload.length > 0) {
      const uploadedFile = filesToUpload[0];
      const newPath = currentPath === '/' ? `/${uploadedFile.name}` : `${currentPath}/${uploadedFile.name}`;
      setSelectedFiles(new Set([newPath]));
    }
  };

  const createFolder = () => {
    setPromptModal({
      title: 'Create New Folder',
      value: '',
      placeholder: 'Folder name...',
      onConfirm: async (name) => {
        if (!name) return;
        const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        try {
          await fetch('/api/files/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: newPath })
          });
          fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const createFile = () => {
    setPromptModal({
      title: 'Create New Text File',
      value: '',
      placeholder: 'file.txt (e.g. notes.txt, readme.md)...',
      onConfirm: async (name) => {
        if (!name) return;
        const finalName = name.includes('.') ? name : `${name}.txt`;
        const newPath = currentPath === '/' ? `/${finalName}` : `${currentPath}/${finalName}`;
        try {
          await fetch('/api/files/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: newPath, content: '' })
          });
          fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const deleteItems = () => {
    setConfirmModal({
      title: 'Delete Files',
      message: `Are you sure you want to delete ${selectedFiles.size} items? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const path of selectedFiles) {
            await fetch('/api/files/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path })
            });
          }
          setSelectedFiles(new Set());
          fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const deleteSingleItem = (file: FileInfo) => {
    setConfirmModal({
      title: 'Delete File',
      message: `Are you sure you want to delete "${file.name}"?`,
      onConfirm: async () => {
        try {
          await fetch('/api/files/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: file.path })
          });
          fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const renameItem = (file: FileInfo) => {
    setPromptModal({
      title: 'Rename File/Folder',
      value: file.name,
      onConfirm: async (newName) => {
        if (!newName || newName === file.name) return;
        const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
        const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

        try {
          await fetch('/api/files/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: file.path, destination: newPath })
          });
          if (isSearching) searchFiles(searchQuery);
          else fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const copyItem = (file: FileInfo) => {
    setPromptModal({
      title: 'Copy To Destination',
      value: currentPath,
      placeholder: '/path/to/destination',
      onConfirm: async (dest) => {
        if (!dest) return;
        const newPath = dest === '/' ? `/${file.name}` : `${dest}/${file.name}`;
        try {
          await fetch('/api/files/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: file.path, destination: newPath })
          });
          fetchFiles(currentPath);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const openEditor = async (file: FileInfo) => {
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        setEditingFile({ path: file.path, content: data.content });
      }
    } catch (err) {
      console.error("Failed to load file content", err);
    }
  };

  const saveEditor = async () => {
    if (!editingFile) return;
    try {
      await fetch('/api/files/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: editingFile.path, content: editingFile.content })
      });
      setEditingFile(null);
    } catch (err) {
      console.error("Failed to save file", err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.isDirectory) return <Folder className="text-blue-500 fill-blue-100" />;
    const ext = file.extension;
    if (ext.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return <ImageIcon className="text-purple-500" />;
    if (ext.match(/\.(mp4|webm|avi|mov)$/i)) return <Video className="text-pink-500" />;
    if (ext.match(/\.(mp3|wav|ogg)$/i)) return <Music className="text-yellow-500" />;
    if (ext.match(/\.(zip|tar|gz|rar)$/i)) return <Archive className="text-red-500" />;
    if (ext.match(/\.(txt|md|csv|json|js|ts|html|css)$/i)) return <FileText className="text-green-500" />;
    return <File className="text-gray-500" />;
  };

  const isTextFile = (ext: string) => {
    const cleanExt = ext.toLowerCase().replace('.', '');
    return [
      'txt', 'md', 'csv', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 
      'xml', 'yml', 'yaml', 'ini', 'env', 'conf', 'config', 'sh', 'bat', 
      'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'php', 'sql', 'json5',
      'lock', 'log', 'properties', 'toml', 'gradle', 'gitignore', 'gitattributes'
    ].includes(cleanExt) || cleanExt === '';
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    setCurrentPath(newPath);
  };

  const handleRowClick = (file: FileInfo, e: React.MouseEvent) => {
    if (pickerMode && !file.isDirectory) {
      setSelectedFiles(new Set([file.path]));
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const newSet = new Set(selectedFiles);
      if (newSet.has(file.path)) newSet.delete(file.path);
      else newSet.add(file.path);
      setSelectedFiles(newSet);
      return;
    }

    if (file.isDirectory) {
      setCurrentPath(file.path);
      setIsSearching(false);
      setSearchQuery('');
      return;
    }

    if (isImageFile(file)) {
      setPreviewFile(file);
    } else if (isTextFile(file.extension)) {
      openEditor(file);
    } else {
      setUnsupportedFileDialog(file);
    }
  };

  const SortHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className="px-4 py-3 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest cursor-pointer hover:bg-neutral-100 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
        )}
      </div>
    </th>
  );

  return (
    <div className={`bg-white flex flex-col relative ${pickerMode ? 'h-full w-full' : 'border-2 border-black rounded-3xl h-[calc(100vh-120px)] overflow-hidden'}`}>
      {/* Header / Toolbar */}
      <div className="p-4 border-b-2 border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {!isSearching ? (
            <>
              <button 
                onClick={navigateUp} 
                disabled={currentPath === '/'}
                className="p-2 bg-white border border-neutral-200 rounded-lg disabled:opacity-50 hover:bg-neutral-100 transition-colors"
              >
                <FolderUp size={16} />
              </button>
              <div className="flex items-center gap-1 text-sm font-bold font-mono px-2 py-1 bg-white border border-neutral-200 rounded-lg">
                <span className="text-neutral-400">/</span>
                {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => setCurrentPath('/' + arr.slice(0, i + 1).join('/'))}
                    >
                      {part}
                    </span>
                    {i < arr.length - 1 && <span className="text-neutral-400">/</span>}
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm font-bold flex items-center gap-2">
              <Search size={16} className="text-neutral-400" />
              Search results for "{searchQuery}"
              <button onClick={handleClearSearch} className="ml-2 text-red-500 hover:underline text-xs">Clear</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full sm:w-48 pl-8 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm outline-none focus:border-black transition-colors"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          </form>

          <button onClick={() => isSearching ? searchFiles(searchQuery) : fetchFiles(currentPath)} className="p-2 hover:bg-neutral-200 rounded-lg transition-colors text-neutral-500">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-2 border-b-2 border-neutral-100 flex items-center gap-2 bg-white overflow-x-auto shrink-0">
        <button 
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform shrink-0"
        >
          <Upload size={14} /> Upload
        </button>
        <button 
          onClick={createFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors shrink-0"
        >
          <Plus size={14} /> New Folder
        </button>
        <button 
          onClick={createFile}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors shrink-0"
        >
          <Plus size={14} /> New File
        </button>
        
        {selectedFiles.size > 0 && (
          <>
            <div className="w-px h-6 bg-neutral-200 mx-2 shrink-0"></div>
            <span className="text-xs font-bold text-neutral-500 shrink-0">{selectedFiles.size} selected</span>
            <button 
              onClick={deleteItems}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors shrink-0 ml-auto"
            >
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
            <Folder size={48} className="opacity-20" />
            <p className="font-bold text-sm">No files found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-50 sticky top-0 z-10 border-b-2 border-neutral-100">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFiles(new Set(files.map(f => f.path)));
                      else setSelectedFiles(new Set());
                    }}
                    className="rounded border-neutral-300"
                  />
                </th>
                <SortHeader field="name" label="Name" />
                <SortHeader field="size" label="Size" />
                <SortHeader field="extension" label="Type" />
                <SortHeader field="updatedAt" label="Modified" />
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file) => {
                const isSelected = selectedFiles.has(file.path);
                return (
                  <tr 
                    key={file.path} 
                    className={`border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                    onClick={(e) => handleRowClick(file, e)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(selectedFiles);
                          if (e.target.checked) newSet.add(file.path);
                          else newSet.delete(file.path);
                          setSelectedFiles(newSet);
                        }}
                        className="rounded border-neutral-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
                        <div className="flex flex-col">
                          <span className="font-bold text-sm max-w-[200px] sm:max-w-xs truncate">{file.name}</span>
                          {isSearching && (
                            <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[200px]">{file.path}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 font-mono">
                      {file.isDirectory ? '--' : formatSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 font-mono uppercase">
                      {file.isDirectory ? 'DIR' : file.extension.replace('.', '') || 'FILE'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(file.updatedAt).toLocaleDateString()} {new Date(file.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setDetailsModalFile(file)}
                          className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                          title="File Details"
                        >
                          <Info size={14} />
                        </button>
                        <button 
                          onClick={() => copyItem(file)}
                          className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          onClick={() => renameItem(file)}
                          className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                          title="Rename/Move"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!file.isDirectory && isTextFile(file.extension) && (
                          <button 
                            onClick={() => openEditor(file)}
                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                            title="Edit Content"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        {!file.isDirectory && !isTextFile(file.extension) && (
                           <button 
                             onClick={() => openEditor(file)}
                             className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                             title="Force Edit as Text"
                           >
                             <Code size={14} />
                           </button>
                        )}
                        {!file.isDirectory && (
                           <button 
                             onClick={() => setLinkModal({ file })}
                             className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                             title="Generate Link"
                           >
                             <Link size={14} />
                           </button>
                        )}
                        {pickerMode && !file.isDirectory && (
                           <button 
                             onClick={() => onSelect && onSelect(file)}
                             className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                             title="Select this file"
                           >
                             <CheckCircle2 size={14} />
                           </button>
                        )}
                        <button 
                          onClick={() => deleteSingleItem(file)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Picker Bottom Bar */}
      {pickerMode && selectedFiles.size > 0 && (
        <div className="p-4 border-t-2 border-neutral-100 bg-neutral-50 flex justify-between items-center shrink-0">
          <div className="text-sm font-bold text-neutral-600">
            {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
          </div>
          <button 
            onClick={() => {
              if (onSelect && selectedFiles.size > 0) {
                const selectedPath = Array.from(selectedFiles)[0];
                const file = files.find(f => f.path === selectedPath);
                if (file) onSelect(file);
              }
            }}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:scale-105 hover:bg-blue-600 transition-all uppercase tracking-widest"
          >
            Select File
          </button>
        </div>
      )}

      {/* Text Editor Modal */}
      <AnimatePresence>
        {editingFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white flex flex-col"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b-2 border-black bg-neutral-50 gap-4 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="shrink-0" />
                <h3 className="font-bold text-sm font-mono truncate">{editingFile.path}</h3>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Editor Mode Tabs */}
                <div className="flex items-center gap-1 bg-neutral-200 p-1 rounded-xl">
                  <button 
                    onClick={() => setEditorMode('edit')}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${editorMode === 'edit' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'}`}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setEditorMode('split')}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${editorMode === 'split' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'}`}
                  >
                    Split
                  </button>
                  <button 
                    onClick={() => setEditorMode('preview')}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${editorMode === 'preview' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'}`}
                  >
                    Preview
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={saveEditor}
                    className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button 
                    onClick={() => setEditingFile(null)}
                    className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {(editorMode === 'edit' || editorMode === 'split') && (
                <textarea 
                  value={editingFile.content}
                  onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                  className="flex-1 h-full p-4 font-mono text-sm outline-none resize-none bg-neutral-900 text-neutral-100 border-r border-neutral-800"
                  spellCheck={false}
                />
              )}
              {(editorMode === 'preview' || editorMode === 'split') && (
                <div className="flex-1 h-full bg-neutral-50 overflow-hidden flex flex-col p-4">
                  <div className="flex-1 bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm h-full">
                    <TextFilePreview path={editingFile.path} content={editingFile.content} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={closeUploadModal}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!uploadProgress && e.dataTransfer.files?.length) {
                  setPendingFiles(Array.from(e.dataTransfer.files));
                }
              }}
            >
              <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
                <h3 className="text-lg font-black uppercase tracking-tight">Upload Files</h3>
                {!uploadProgress && (
                  <button onClick={closeUploadModal} className="text-neutral-400 hover:text-black">
                    <X size={20} />
                  </button>
                )}
              </div>

              {uploadProgress ? (
                <div className="space-y-4 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                      <RefreshCw size={14} className="animate-spin" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{uploadProgress.file}</p>
                      <p className="text-xs text-neutral-500 mt-1">Uploading... {uploadProgress.progress}%</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              ) : pendingFiles.length === 0 ? (
                <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-neutral-50 transition-colors">
                  <DownloadCloud size={48} className="text-neutral-300 mb-4" />
                  <p className="text-sm font-bold mb-1">Drag and drop files here</p>
                  <p className="text-xs text-neutral-500 mb-6">or click to browse from your computer</p>
                  <input 
                    type="file" 
                    multiple={!pickerMode} 
                    className="hidden" 
                    id="file-upload" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setPendingFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <label 
                    htmlFor="file-upload"
                    className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold cursor-pointer hover:scale-105 transition-transform"
                  >
                    Select Files
                  </label>
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  {/* Step 1: File Selection */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-2">1. File Selection</span>
                    <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                      <div className="bg-neutral-200 p-2 rounded-lg text-neutral-600">
                        <Upload size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-700">Change Selection</p>
                        <p className="text-[10px] text-neutral-400">Select different files from your system</p>
                      </div>
                      <input 
                        type="file" 
                        multiple={!pickerMode} 
                        className="hidden" 
                        id="file-upload-change" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setPendingFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      <label 
                        htmlFor="file-upload-change"
                        className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                      >
                        Choose
                      </label>
                    </div>
                  </div>

                  {/* Step 2: File Information and Preview */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-2">2. File Information & Preview</span>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                      {pendingFiles.map((file, idx) => {
                        const isImg = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|ico)$/i);
                        return (
                          <div key={idx} className="flex gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100 items-start">
                            {isImg ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 shrink-0 bg-white flex items-center justify-center">
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt="thumbnail" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center text-neutral-500">
                                {getFileIcon({ 
                                  name: file.name, 
                                  extension: '.' + (file.name.split('.').pop() || ''), 
                                  isDirectory: false, 
                                  size: file.size, 
                                  path: '', 
                                  createdAt: '', 
                                  updatedAt: '' 
                                })}
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs font-bold text-neutral-800 truncate" title={file.name}>{file.name}</p>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-neutral-500 font-mono">
                                <div>
                                  <span className="text-neutral-400">Type:</span> <span className="font-bold">{file.type || 'unknown'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-400">Size:</span> <span className="font-bold">{formatSize(file.size)}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-neutral-400">Modified:</span> <span className="font-bold">{new Date(file.lastModified).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Upload Confirmation */}
                  <div className="border-t border-neutral-100 pt-4">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-2">3. Upload Confirmation</span>
                    <div className="flex gap-3 justify-end">
                      <button 
                        type="button"
                        onClick={() => setPendingFiles([])}
                        className="px-4 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={() => executeUpload(pendingFiles)}
                        className="px-5 py-2 text-xs font-bold bg-black text-white rounded-lg hover:scale-105 transition-transform uppercase tracking-wider"
                      >
                        Confirm Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Modal */}
      <AnimatePresence>
        {promptModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setPromptModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6"
            >
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">{promptModal.title}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('promptInput') as HTMLInputElement;
                promptModal.onConfirm(input.value);
                setPromptModal(null);
              }}>
                <input 
                  type="text" 
                  name="promptInput"
                  defaultValue={promptModal.value}
                  placeholder={promptModal.placeholder}
                  className="w-full p-3 border-2 border-neutral-200 rounded-xl outline-none focus:border-black font-mono text-sm mb-6"
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setPromptModal(null)}
                    className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-sm font-bold bg-black text-white rounded-lg hover:scale-105 transition-transform"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-black uppercase tracking-tight text-black">{confirmModal.title}</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-lg hover:scale-105 transition-transform"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Link Modal */}
      <AnimatePresence>
        {linkModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setLinkModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Link size={20} /> Share File
                </h3>
                <button onClick={() => setLinkModal(null)} className="text-neutral-400 hover:text-black">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Direct Link</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/files${linkModal.file.path}`}
                      className="flex-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/files${linkModal.file.path}`);
                        alert('Copied direct link!');
                      }}
                      className="px-4 py-2 bg-black text-white rounded-lg font-bold text-sm hover:scale-105 transition-transform"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Short Link (Download Page)</label>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/files/shorten', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path: linkModal.file.path })
                        });
                        const data = await res.json();
                        const shortUrl = `${window.location.origin}/download/${data.id}`;
                        navigator.clipboard.writeText(shortUrl);
                        alert(`Short link generated and copied: ${shortUrl}`);
                        setLinkModal(null);
                      } catch (err) {
                        console.error(err);
                        alert('Failed to generate short link');
                      }
                    }}
                    className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                  >
                    Generate & Copy Short Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Details Modal */}
      <AnimatePresence>
        {detailsModalFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setDetailsModalFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Info size={20} className="text-black" /> File Details
                </h3>
                <button onClick={() => setDetailsModalFile(null)} className="text-neutral-400 hover:text-black">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">File Name</span>
                  <span className="font-bold text-neutral-800 break-all">{detailsModalFile.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Type / MIME</span>
                    <span className="font-bold text-neutral-800 font-mono text-xs break-all">
                      {detailsModalFile.isDirectory ? 'Directory' : getMimeType(detailsModalFile.extension)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Extension</span>
                    <span className="font-bold text-neutral-800 font-mono uppercase text-xs">
                      {detailsModalFile.isDirectory ? 'N/A' : detailsModalFile.extension.replace('.', '') || 'None'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Size</span>
                    <span className="font-bold text-neutral-800">
                      {detailsModalFile.isDirectory ? '--' : formatSize(detailsModalFile.size)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Dimensions</span>
                    <span className="font-bold text-neutral-800 font-mono text-xs">
                      {!detailsModalFile.isDirectory && isImageFile(detailsModalFile)
                        ? imgDimensions 
                          ? `${imgDimensions.width} × ${imgDimensions.height} px` 
                          : 'Loading...'
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Path / Location</span>
                  <span className="font-bold text-neutral-800 font-mono text-xs break-all">{detailsModalFile.path}</span>
                </div>

                <div className="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-850">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Created At</span>
                    <span className="font-bold text-neutral-700">{new Date(detailsModalFile.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Uploaded At</span>
                    <span className="font-bold text-neutral-700">{new Date(detailsModalFile.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Last Modified</span>
                    <span className="font-bold text-neutral-700">{new Date(detailsModalFile.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Owner / Uploader</span>
                  <span className="font-bold text-neutral-800 font-mono">{auth.currentUser?.email || 'System'}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setDetailsModalFile(null)}
                  className="px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:scale-105 transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl"
            >
              {/* Image Preview Container (Left Side) */}
              <div className="relative flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden h-[50vh] md:h-full group">
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img 
                    src={`${window.location.origin}/files${previewFile.path}`}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Zoom Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white z-10 border border-white/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
                    disabled={zoomLevel <= 1}
                    className="p-1 hover:text-neutral-300 disabled:opacity-40 transition-opacity"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-mono font-bold min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
                    disabled={zoomLevel >= 3}
                    className="p-1 hover:text-neutral-300 disabled:opacity-40 transition-opacity"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  {zoomLevel !== 1 && (
                    <button 
                      onClick={() => setZoomLevel(1)}
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded hover:bg-white/30"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar Info & Actions (Right Side) */}
              <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-neutral-100 flex flex-col h-[35vh] md:h-full bg-white text-sm">
                {/* Header */}
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-black uppercase tracking-tight truncate max-w-[80%]" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <button onClick={() => setPreviewFile(null)} className="text-neutral-400 hover:text-black">
                    <X size={20} />
                  </button>
                </div>

                {/* Content / Info */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-neutral-800">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">File Size</span>
                      <span className="text-sm font-bold text-neutral-800">{formatSize(previewFile.size)}</span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Dimensions</span>
                      <span className="text-sm font-bold text-neutral-800 font-mono">
                        {imgDimensions ? `${imgDimensions.width} × ${imgDimensions.height} px` : 'Loading...'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Format</span>
                      <span className="text-sm font-bold text-neutral-800 uppercase font-mono text-xs">
                        {previewFile.extension.replace('.', '')} ({getMimeType(previewFile.extension)})
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Last Modified</span>
                      <span className="text-sm font-bold text-neutral-800">
                        {new Date(previewFile.updatedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Location</span>
                      <span className="text-xs font-bold text-neutral-600 font-mono break-all">{previewFile.path}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-2 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    <a 
                      href={`${window.location.origin}/files${previewFile.path}`}
                      download={previewFile.name}
                      className="flex items-center justify-center gap-1.5 py-2 border border-neutral-200 bg-white text-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-50 transition-colors"
                    >
                      <Download size={14} /> Download
                    </a>
                    <a 
                      href={`${window.location.origin}/files${previewFile.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 border border-neutral-200 bg-white text-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-50 transition-colors"
                    >
                      <ExternalLink size={14} /> Open Tab
                    </a>
                  </div>
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="w-full py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsupported File Modal */}
      <AnimatePresence>
        {unsupportedFileDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setUnsupportedFileDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6 text-center border-2 border-black"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-neutral-800 mb-2">Unsupported File</h3>
              <p className="text-sm text-neutral-500 mb-6">
                This file seems to be unsupported.
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    const fileToOpen = unsupportedFileDialog;
                    setUnsupportedFileDialog(null);
                    openEditor(fileToOpen);
                  }}
                  className="w-full py-2.5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                >
                  Force preview/edit as text
                </button>
                <button 
                  onClick={() => setUnsupportedFileDialog(null)}
                  className="w-full py-2.5 bg-neutral-100 text-neutral-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
