import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import serveIndex from "serve-index";
import "dotenv/config";
import apiRouter from "./server/api.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Mount API routes
app.use("/api", apiRouter);

const FILES_DIR = path.join(process.cwd(), "files");
const LINKS_FILE = path.join(process.cwd(), "data", "links.json");

app.use("/files", express.static(FILES_DIR), serveIndex(FILES_DIR, { 'icons': true }));

// Ensure directories exist
async function ensureDirs() {
  try {
    await fs.mkdir(FILES_DIR, { recursive: true });
    await fs.mkdir(path.dirname(LINKS_FILE), { recursive: true });
  } catch (err) {
    console.error("Error creating directories:", err);
  }
}
ensureDirs();

async function getLinks() {
  try {
    const data = await fs.readFile(LINKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

app.post("/api/files/shorten", async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Path is required" });
    
    // Check if valid
    getSecurePath(filePath);
    
    const id = Math.random().toString(36).substring(2, 8);
    const links = await getLinks();
    links[id] = filePath;
    await fs.writeFile(LINKS_FILE, JSON.stringify(links, null, 2));
    
    res.json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files/link/:id", async (req, res) => {
  try {
    const links = await getLinks();
    const filePath = links[req.params.id];
    if (!filePath) return res.status(404).json({ error: "Link not found" });
    
    const absolutePath = getSecurePath(filePath);
    const info = await getFileInfo(absolutePath, filePath);
    
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to secure path
function getSecurePath(userPath: string) {
  const normalizedPath = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
  const securePath = path.join(FILES_DIR, normalizedPath);
  if (!securePath.startsWith(FILES_DIR)) {
    throw new Error("Invalid path");
  }
  return securePath;
}

// Get files info
async function getFileInfo(filePath: string, relativePath: string) {
  const stat = await fs.stat(filePath);
  return {
    name: path.basename(filePath),
    path: relativePath,
    isDirectory: stat.isDirectory(),
    size: stat.size,
    updatedAt: stat.mtime,
    createdAt: stat.ctime,
    extension: path.extname(filePath).toLowerCase(),
  };
}

// Upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const targetPath = req.query.path ? getSecurePath(req.query.path as string) : FILES_DIR;
      cb(null, targetPath);
    } catch (err: any) {
      cb(err, FILES_DIR);
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// API Routes
app.get("/api/files", async (req, res) => {
  try {
    const dirPath = req.query.path ? req.query.path as string : "/";
    const absolutePath = getSecurePath(dirPath);
    const files = await fs.readdir(absolutePath);
    
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(absolutePath, file);
        const relativePath = path.join(dirPath, file).replace(/\\/g, '/');
        return getFileInfo(filePath, relativePath);
      })
    );
    
    res.json(fileInfos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Recursive search
async function walkDir(dir: string, baseDir: string, query: string, results: any[]) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    const relativePath = filePath.replace(baseDir, '').replace(/\\/g, '/') || '/';
    
    if (file.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        name: file,
        path: relativePath,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        updatedAt: stat.mtime,
        createdAt: stat.ctime,
        extension: path.extname(file).toLowerCase(),
      });
    }
    
    if (stat.isDirectory()) {
      await walkDir(filePath, baseDir, query, results);
    }
  }
}

app.get("/api/files/search", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    const results: any[] = [];
    await walkDir(FILES_DIR, FILES_DIR, query, results);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files/upload", upload.array("files"), (req, res) => {
  res.json({ message: "Uploaded successfully", files: req.files });
});

app.post("/api/files/copy", async (req, res) => {
  try {
    const { source, destination } = req.body;
    const sourcePath = getSecurePath(source);
    const destPath = getSecurePath(destination);
    
    const stat = await fs.stat(sourcePath);
    if (stat.isDirectory()) {
      await fs.cp(sourcePath, destPath, { recursive: true });
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
    res.json({ message: "Copied successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files/move", async (req, res) => {
  try {
    const { source, destination } = req.body;
    const sourcePath = getSecurePath(source);
    const destPath = getSecurePath(destination);
    await fs.rename(sourcePath, destPath);
    res.json({ message: "Moved successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/files/delete", async (req, res) => {
  try {
    const { path: filePath } = req.body;
    const absolutePath = getSecurePath(filePath);
    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
      await fs.rm(absolutePath, { recursive: true, force: true });
    } else {
      await fs.unlink(absolutePath);
    }
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files/create-folder", async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    const absolutePath = getSecurePath(folderPath);
    await fs.mkdir(absolutePath, { recursive: true });
    res.json({ message: "Folder created successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files/content", async (req, res) => {
  try {
    const filePath = req.query.path as string;
    const absolutePath = getSecurePath(filePath);
    
    // Check if it's text
    const content = await fs.readFile(absolutePath, "utf-8");
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files/content", async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const absolutePath = getSecurePath(filePath);
    await fs.writeFile(absolutePath, content, "utf-8");
    res.json({ message: "Saved successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error("Server unhandled error:", err);
      process.exit(1);
    }
  });
}

startServer();
