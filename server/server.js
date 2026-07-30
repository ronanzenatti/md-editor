import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Active workspace variable
let activeWorkspace = null;

// Dynamic static middleware for active workspace media
app.use('/media', (req, res, next) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  express.static(activeWorkspace)(req, res, next);
});

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Helpers
async function getGitStatus(cwd) {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    return stdout;
  } catch (error) {
    return null;
  }
}

// APIs
// Get current workspace status
app.get('/api/workspace', async (req, res) => {
  if (!activeWorkspace) {
    return res.json({ activeWorkspace: null });
  }
  
  const isGit = existsSync(path.join(activeWorkspace, '.git'));
  const gitStatus = isGit ? await getGitStatus(activeWorkspace) : null;
  
  res.json({
    activeWorkspace,
    isGit,
    gitStatus
  });
});

// Set active workspace (and initialize git if not versioned)
app.post('/api/workspace', async (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'folderPath is required' });
  }
  
  try {
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    // Normalize path
    const resolvedPath = path.resolve(folderPath);
    
    // Check if git is initialized
    const gitDir = path.join(resolvedPath, '.git');
    let initializedGit = false;
    
    if (!existsSync(gitDir)) {
      try {
        await execAsync('git init', { cwd: resolvedPath });
        initializedGit = true;
      } catch (gitErr) {
        return res.status(500).json({ error: `Failed to initialize git: ${gitErr.message}` });
      }
    }
    
    activeWorkspace = resolvedPath;
    res.json({
      success: true,
      workspace: resolvedPath,
      initializedGit,
      isGit: true
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to open workspace: ${err.message}` });
  }
});

// Helper to extract repo name from URL
function getRepoName(repoUrl) {
  try {
    const parts = repoUrl.split('/');
    let lastPart = parts[parts.length - 1];
    if (lastPart.endsWith('.git')) {
      lastPart = lastPart.substring(0, lastPart.length - 4);
    }
    return lastPart.replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch (e) {
    return 'repo_' + Date.now();
  }
}

// Clone remote Git repository
app.post('/api/workspace/clone', async (req, res) => {
  const { repoUrl, branch, token } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  try {
    const repoName = getRepoName(repoUrl);
    const workspacesDir = path.join(__dirname, '../workspaces');
    const targetPath = path.join(workspacesDir, repoName);

    // Create workspaces directory if it doesn't exist
    await fs.mkdir(workspacesDir, { recursive: true });

    // Check if target directory already exists
    const gitDir = path.join(targetPath, '.git');
    if (existsSync(gitDir)) {
      try {
        console.log(`Repository already exists at ${targetPath}. Running git pull...`);
        await execAsync('git pull', { cwd: targetPath });
        activeWorkspace = targetPath;
        return res.json({
          success: true,
          workspace: targetPath,
          alreadyExists: true,
          message: 'Repository already exists. Updated with latest changes.'
        });
      } catch (pullErr) {
        activeWorkspace = targetPath;
        return res.json({
          success: true,
          workspace: targetPath,
          alreadyExists: true,
          warning: `Repository exists but pull failed: ${pullErr.message}`
        });
      }
    }

    // Build the clone URL, injecting the token if provided
    let cloneUrl = repoUrl;
    if (token && repoUrl.startsWith('https://')) {
      cloneUrl = repoUrl.replace('https://', `https://${encodeURIComponent(token)}@`);
    }

    console.log(`Cloning repository ${repoUrl} into ${targetPath}...`);
    let cloneCmd = `git clone "${cloneUrl}" "${targetPath}"`;
    if (branch && branch.trim() !== '') {
      cloneCmd = `git clone --branch ${branch.trim()} "${cloneUrl}" "${targetPath}"`;
    }
    await execAsync(cloneCmd);
    
    activeWorkspace = targetPath;
    
    res.json({
      success: true,
      workspace: targetPath,
      message: 'Repository cloned successfully.'
    });
  } catch (err) {
    console.error('Clone failed:', err);
    res.status(500).json({ error: `Failed to clone repository: ${err.message}` });
  }
});

// Sync Git Repository (Pull -> Commit -> Push)
app.post('/api/git/sync', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }

  try {
    const cwd = activeWorkspace;

    // 1. Get git status to check if there are changes
    const status = await getGitStatus(cwd);
    let committed = false;

    if (status && status.trim() !== '') {
      console.log('Syncing: Committing changes...');
      await execAsync('git add .', { cwd });
      // Use standard commit message
      await execAsync('git commit -m "Autosave/Sync via Markdown Git Editor"', { cwd });
      committed = true;
    }

    // 2. Pull remote changes
    console.log('Syncing: Pulling changes...');
    let pulled = false;
    try {
      await execAsync('git pull --rebase', { cwd });
      pulled = true;
    } catch (pullErr) {
      console.warn('Pull failed, attempting standard pull:', pullErr.message);
      await execAsync('git pull', { cwd });
      pulled = true;
    }

    // 3. Push local changes
    console.log('Syncing: Pushing changes...');
    let pushed = false;
    try {
      await execAsync('git push', { cwd });
      pushed = true;
    } catch (pushErr) {
      return res.status(500).json({ 
        error: `Git push failed: ${pushErr.message}. Make sure you have remote write permissions and correct credentials.` 
      });
    }

    res.json({
      success: true,
      committed,
      pulled,
      pushed,
      message: committed ? 'Changes committed, pulled, and pushed successfully.' : 'Repository pulled and is up-to-date.'
    });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

// System Folder browser for Web clients
app.get('/api/system/browse', async (req, res) => {
  const queryPath = req.query.path || process.cwd();
  
  try {
    const resolvedPath = path.resolve(queryPath);
    const files = await fs.readdir(resolvedPath);
    const items = [];
    
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '$RECYCLE.BIN') continue;
      
      try {
        const fullPath = path.join(resolvedPath, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          items.push({
            name: file,
            path: fullPath,
            isDir: true
          });
        }
      } catch (err) {
        // Skip unreadable files/dirs
      }
    }
    
    // Sort directories alphabetically
    items.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      currentPath: resolvedPath,
      parentPath: path.dirname(resolvedPath),
      items
    });
  } catch (err) {
    res.status(500).json({ error: `Cannot browse path: ${err.message}` });
  }
});

// Native OS Folder Selection Dialog trigger for Web clients running locally
app.post('/api/system/select-folder', async (req, res) => {
  try {
    let selectedPath = '';
    
    if (process.platform === 'win32') {
      // Run PowerShell to open System.Windows.Forms.FolderBrowserDialog in foreground
      const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Selecione a pasta do repositório'; $f.ShowNewFolderButton = $true; $b = New-Object System.Windows.Forms.Form; $b.TopMost = $true; $b.Opacity = 0; $b.ShowInTaskbar = $false; $b.Width = 1; $b.Height = 1; $b.Show(); $b.Activate(); if ($f.ShowDialog($b) -eq 'OK') { Write-Output $f.SelectedPath }; $b.Dispose()"`;
      const { stdout } = await execAsync(psCommand);
      selectedPath = stdout.trim();
    } else if (process.platform === 'darwin') {
      // AppleScript choose folder
      const osascriptCommand = `osascript -e 'POSIX path of (choose folder with prompt "Selecione a pasta do repositório")'`;
      const { stdout } = await execAsync(osascriptCommand);
      selectedPath = stdout.trim();
    } else {
      // Linux zenity
      try {
        const { stdout } = await execAsync('zenity --file-selection --directory --title="Selecione a pasta do repositório"');
        selectedPath = stdout.trim();
      } catch (err) {
        return res.status(500).json({ error: 'Nenhum utilitário de seleção de pasta nativo encontrado no Linux.' });
      }
    }
    
    if (!selectedPath) {
      return res.json({ cancelled: true });
    }
    
    res.json({ success: true, folderPath: selectedPath });
  } catch (err) {
    res.status(500).json({ error: `Falha ao abrir o seletor de pastas: ${err.message}` });
  }
});

// Helper function to build folder tree recursively
async function buildFileTree(dirPath, rootPath) {
  const files = await fs.readdir(dirPath);
  const result = [];
  
  for (const file of files) {
    if (file === 'node_modules' || file === '.git') continue;
    
    try {
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const children = await buildFileTree(fullPath, rootPath);
        result.push({
          name: file,
          path: fullPath,
          relativePath,
          isDir: true,
          children: children.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        });
      } else {
        result.push({
          name: file,
          path: fullPath,
          relativePath,
          isDir: false
        });
      }
    } catch (err) {
      console.warn(`Skipping file/dir: ${file} due to read error:`, err.message);
    }
  }
  
  return result.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Get file tree
app.get('/api/files', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  try {
    const tree = await buildFileTree(activeWorkspace, activeWorkspace);
    res.json({ files: tree });
  } catch (err) {
    res.status(500).json({ error: `Failed to read files: ${err.message}` });
  }
});

// Create file or directory
app.post('/api/files/create', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  const { name, isDir, parentPath } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const baseDir = parentPath ? path.resolve(activeWorkspace, parentPath) : activeWorkspace;
  const targetPath = path.join(baseDir, name);
  
  // Security check: ensure path is within activeWorkspace
  if (!targetPath.startsWith(activeWorkspace)) {
    return res.status(403).json({ error: 'Access denied: Target path outside workspace' });
  }
  
  try {
    if (isDir) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      // Ensure target path subdirectories exist
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, '');
    }
    res.json({ success: true, path: targetPath });
  } catch (err) {
    res.status(500).json({ error: `Failed to create item: ${err.message}` });
  }
});

// Rename file or directory
app.post('/api/files/rename', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'oldPath and newPath are required' });
  }
  
  const resolvedOld = path.resolve(activeWorkspace, oldPath);
  const resolvedNew = path.resolve(activeWorkspace, newPath);
  
  if (!resolvedOld.startsWith(activeWorkspace) || !resolvedNew.startsWith(activeWorkspace)) {
    return res.status(403).json({ error: 'Access denied: Target path outside workspace' });
  }
  
  try {
    await fs.rename(resolvedOld, resolvedNew);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to rename: ${err.message}` });
  }
});

// Delete file or directory
app.delete('/api/files/delete', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  const { targetPath } = req.body;
  if (!targetPath) {
    return res.status(400).json({ error: 'Path is required' });
  }
  
  const resolvedPath = path.resolve(activeWorkspace, targetPath);
  if (!resolvedPath.startsWith(activeWorkspace)) {
    return res.status(403).json({ error: 'Access denied: Target path outside workspace' });
  }
  
  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isDirectory()) {
      await fs.rm(resolvedPath, { recursive: true, force: true });
    } else {
      await fs.unlink(resolvedPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete: ${err.message}` });
  }
});

// Read file content
app.get('/api/files/read', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  const filePath = req.query.filePath;
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }
  
  const resolvedPath = path.resolve(activeWorkspace, filePath);
  if (!resolvedPath.startsWith(activeWorkspace)) {
    return res.status(403).json({ error: 'Access denied: Target path outside workspace' });
  }
  
  try {
    const content = await fs.readFile(resolvedPath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: `Failed to read file: ${err.message}` });
  }
});

// Write file content (Autosave / Manual save)
app.post('/api/files/write', async (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  
  const { filePath, content } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }
  
  const resolvedPath = path.resolve(activeWorkspace, filePath);
  if (!resolvedPath.startsWith(activeWorkspace)) {
    return res.status(403).json({ error: 'Access denied: Target path outside workspace' });
  }
  
  try {
    await fs.writeFile(resolvedPath, content || '', 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to write file: ${err.message}` });
  }
});

// Set up file storage destination dynamically based on upload type
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    if (!activeWorkspace) {
      return cb(new Error('No workspace active'));
    }
    
    const type = req.query.type || 'image'; // image, video, or file
    let folderName = 'imgs';
    if (type === 'video') {
      folderName = 'videos';
    } else if (type === 'file') {
      folderName = 'arquivos';
    }
    const uploadDir = path.join(activeWorkspace, folderName);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Keep original file extension but prepend timestamp to prevent collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Media & File Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!activeWorkspace) {
    return res.status(400).json({ error: 'No workspace folder selected' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const type = req.query.type || 'image';
  let folderName = 'imgs';
  if (type === 'video') {
    folderName = 'videos';
  } else if (type === 'file') {
    folderName = 'arquivos';
  }
  
  // Return the relative workspace URL for markdown integration
  const relativePath = `${folderName}/${req.file.filename}`;
  
  res.json({
    success: true,
    name: req.file.originalname,
    path: relativePath,
    url: `/media/${relativePath}`
  });
});

// Serve frontend html in fallback
app.get('{*splat}', (req, res) => {
  if (existsSync(path.join(frontendDistPath, 'index.html'))) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.send('Server is running. Frontend not compiled yet.');
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Assuming server is already running.`);
  } else {
    console.error('Server error:', err);
  }
});
