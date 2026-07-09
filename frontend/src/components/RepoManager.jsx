import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderOpen, ChevronDown, ChevronRight, 
  FileText, FileCode, FileImage, FileVideo, FileArchive, File, Settings,
  Plus, Trash2, Edit2, X, Check, 
  FilePlus, FolderPlus, GitBranch, RefreshCw, Cloud 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = window.location.origin.includes('localhost:5173') 
  ? 'http://localhost:3001' 
  : window.location.origin;

// Helper function to return beautiful type-specific file icons
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  // Settings/Config files
  if (fileName.startsWith('.') || fileName === 'package.json' || fileName === 'vite.config.js') {
    return <Settings size={16} style={{ color: 'var(--text-muted)' }} />;
  }
  
  switch (ext) {
    case 'md':
      return <FileText size={16} style={{ color: 'var(--color-primary-hover)' }} />; // Purple edit
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'py':
    case 'rs':
    case 'go':
    case 'json':
      return <FileCode size={16} style={{ color: 'hsl(38, 92%, 50%)' }} />; // Yellow/Warning gold
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage size={16} style={{ color: 'var(--color-success)' }} />; // Green
    case 'mp4':
    case 'webm':
    case 'ogg':
    case 'mov':
    case 'avi':
      return <FileVideo size={16} style={{ color: 'var(--color-danger)' }} />; // Red
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return <FileArchive size={16} style={{ color: 'hsl(25, 85%, 55%)' }} />; // Orange
    case 'txt':
    case 'log':
      return <FileText size={16} style={{ color: 'var(--text-muted)' }} />; // Muted gray
    default:
      return <File size={16} style={{ color: 'var(--text-dark)' }} />; // Dark generic
  }
};

export default function RepoManager({ activeFile, onFileSelected, workspacePath }) {
  const { t } = useLanguage();
  const [treeData, setTreeData] = useState([]);
  const [gitInfo, setGitInfo] = useState({ isGit: false, statusText: '' });
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({}); // path -> boolean
  const [renameTarget, setRenameTarget] = useState(null); // path of node being renamed
  const [renameValue, setRenameValue] = useState('');
  
  // Inline creation states: path of parent -> 'file' | 'folder' | null
  const [createTarget, setCreateTarget] = useState(null);
  const [createValue, setCreateValue] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Fetch tree
      const res = await fetch(`${API_BASE}/api/files`);
      const data = await res.json();
      if (data.files) {
        setTreeData(data.files);
      }
      
      // Fetch git status
      const gitRes = await fetch(`${API_BASE}/api/workspace`);
      const gitData = await gitRes.json();
      if (gitData.isGit) {
        // Count modified files
        const lines = gitData.gitStatus ? gitData.gitStatus.trim().split('\n').filter(Boolean) : [];
        setGitInfo({
          isGit: true,
          statusText: lines.length > 0 
            ? `${lines.length} ${t('modified_files')}` 
            : t('clean_repo')
        });
      } else {
        setGitInfo({
          isGit: false,
          statusText: t('not_versioned')
        });
      }
    } catch (err) {
      console.error('Failed to load files or git status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGitSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/git/sync`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(t('sync_success'));
        await fetchFiles();
      } else {
        alert(data.error || 'Failed to sync repository.');
      }
    } catch (err) {
      alert(`Error syncing repository: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (workspacePath) {
      fetchFiles();
    }
  }, [workspacePath, t]);

  const toggleExpand = (path) => {
    setExpandedNodes(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCreate = async (parentPath, type) => {
    if (!createValue.trim()) return;
    
    // Auto-append .md for new files if not provided
    let finalName = createValue.trim();
    if (type === 'file' && !finalName.endsWith('.md')) {
      finalName += '.md';
    }

    try {
      const res = await fetch(`${API_BASE}/api/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          isDir: type === 'folder',
          parentPath: parentPath
        })
      });
      const data = await res.json();
      if (data.success) {
        setCreateTarget(null);
        setCreateValue('');
        await fetchFiles();
        
        // Auto-select and open the new file if it's a file
        if (type === 'file') {
          // Parent path + file name is the relative path
          const fileRelPath = parentPath ? `${parentPath}/${finalName}` : finalName;
          onFileSelected(fileRelPath);
        }
      } else {
        alert(data.error || 'Failed to create item');
      }
    } catch (err) {
      alert(`Error creating item: ${err.message}`);
    }
  };

  const handleRename = async (node) => {
    if (!renameValue.trim() || renameValue === node.name) {
      setRenameTarget(null);
      return;
    }

    // Get parent path
    const parts = node.relativePath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    const newRelativePath = parentPath ? `${parentPath}/${renameValue}` : renameValue;

    try {
      const res = await fetch(`${API_BASE}/api/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: node.relativePath,
          newPath: newRelativePath
        })
      });
      const data = await res.json();
      if (data.success) {
        setRenameTarget(null);
        await fetchFiles();
        if (activeFile === node.relativePath) {
          onFileSelected(newRelativePath);
        }
      } else {
        alert(data.error || 'Failed to rename');
      }
    } catch (err) {
      alert(`Error renaming item: ${err.message}`);
    }
  };

  const handleDelete = async (node) => {
    if (!confirm(t('confirm_delete', { name: node.name }))) return;

    try {
      const res = await fetch(`${API_BASE}/api/files/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPath: node.relativePath
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
        if (activeFile === node.relativePath) {
          onFileSelected(null);
        }
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  // Recursive render node
  const renderTreeNode = (node) => {
    const isDir = node.isDir;
    const isExpanded = !!expandedNodes[node.relativePath];
    const isRenaming = renameTarget === node.relativePath;
    const isSelected = activeFile === node.relativePath;
    
    // Check if there's a pending creation under this folder
    const isCreatingHere = createTarget?.parent === node.relativePath;

    return (
      <div key={node.relativePath} className="tree-node">
        <div 
          className={`tree-node-row ${isSelected ? 'active' : ''}`}
          style={{ paddingLeft: `${isDir ? 8 : 24}px` }}
          onClick={() => {
            if (isDir) {
              toggleExpand(node.relativePath);
            } else {
              onFileSelected(node.relativePath);
            }
          }}
        >
          {isDir && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          
          {isDir ? (
            isExpanded ? (
              <FolderOpen size={16} style={{ color: 'var(--color-primary)' }} />
            ) : (
              <Folder size={16} style={{ color: 'var(--color-primary)' }} />
            )
          ) : (
            // Dynamic type-specific file icon
            getFileIcon(node.name)
          )}

          {isRenaming ? (
            <input 
              type="text"
              className="tree-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node);
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              autoFocus
            />
          ) : (
            <span className="tree-node-label">{node.name}</span>
          )}

          {!isRenaming && (
            <div className="tree-node-actions" onClick={(e) => e.stopPropagation()}>
              {isDir && (
                <>
                  <button 
                    className="icon-btn" 
                    title={t('new_file')}
                    onClick={() => {
                      setExpandedNodes(prev => ({ ...prev, [node.relativePath]: true }));
                      setCreateTarget({ parent: node.relativePath, type: 'file' });
                    }}
                  >
                    <FilePlus size={13} />
                  </button>
                  <button 
                    className="icon-btn" 
                    title={t('new_folder')}
                    onClick={() => {
                      setExpandedNodes(prev => ({ ...prev, [node.relativePath]: true }));
                      setCreateTarget({ parent: node.relativePath, type: 'folder' });
                    }}
                  >
                    <FolderPlus size={13} />
                  </button>
                </>
              )}
              <button 
                className="icon-btn" 
                title={t('rename')}
                onClick={() => {
                  setRenameTarget(node.relativePath);
                  setRenameValue(node.name);
                }}
              >
                <Edit2 size={13} />
              </button>
              <button 
                className="icon-btn danger" 
                title={t('delete')}
                onClick={() => handleDelete(node)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {isDir && isExpanded && (
          <div className="tree-children">
            {/* Inline creation node */}
            {isCreatingHere && (
              <div 
                className="tree-node-row" 
                style={{ paddingLeft: '8px', gap: '6px' }}
                onClick={(e) => e.stopPropagation()}
              >
                {createTarget.type === 'folder' ? <Folder size={14} style={{ color: 'var(--color-primary)' }} /> : getFileIcon(createValue || 'newfile.txt')}
                <input 
                  type="text"
                  className="tree-rename-input"
                  placeholder={createTarget.type === 'folder' ? `${t('new_folder')}...` : `${t('new_file')}...`}
                  value={createValue}
                  onChange={(e) => setCreateValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate(node.relativePath, createTarget.type);
                    if (e.key === 'Escape') setCreateTarget(null);
                  }}
                  autoFocus
                />
                <button className="icon-btn" onClick={() => handleCreate(node.relativePath, createTarget.type)}>
                  <Check size={12} />
                </button>
                <button className="icon-btn danger" onClick={() => setCreateTarget(null)}>
                  <X size={12} />
                </button>
              </div>
            )}

            {node.children && node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Check if root-level creation is pending
  const isCreatingRoot = createTarget?.parent === '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Git status and repo refresh */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justification: 'space-between', backgroundColor: 'hsla(225, 25%, 8%, 0.2)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <GitBranch size={14} style={{ color: 'var(--color-primary)' }} />
          <span>{gitInfo.statusText}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {/* Root-level creation buttons */}
          <button 
            className="icon-btn" 
            title={t('create_file_root')}
            onClick={() => setCreateTarget({ parent: '', type: 'file' })}
          >
            <FilePlus size={14} />
          </button>
          <button 
            className="icon-btn" 
            title={t('create_folder_root')}
            onClick={() => setCreateTarget({ parent: '', type: 'folder' })}
          >
            <FolderPlus size={14} />
          </button>
          <button 
            className="icon-btn" 
            onClick={handleGitSync} 
            disabled={loading || syncing} 
            title={t('sync_repo')}
            style={{ color: syncing ? 'var(--color-primary-hover)' : 'inherit' }}
          >
            <Cloud size={14} className={syncing ? 'animate-pulse' : ''} />
          </button>
          <button className="icon-btn" onClick={fetchFiles} disabled={loading || syncing} title={t('refresh')}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="panel-content" style={{ padding: '4px 0' }}>
        {/* Render tree */}
        <div className="file-tree">
          {/* Root inline create */}
          {isCreatingRoot && (
            <div 
              className="tree-node-row" 
              style={{ paddingLeft: '8px', gap: '6px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {createTarget.type === 'folder' ? <Folder size={14} style={{ color: 'var(--color-primary)' }} /> : getFileIcon(createValue || 'newfile.txt')}
              <input 
                type="text"
                className="tree-rename-input"
                placeholder={createTarget.type === 'folder' ? `${t('new_folder')}...` : `${t('new_file')}...`}
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate('', createTarget.type);
                  if (e.key === 'Escape') setCreateTarget(null);
                }}
                autoFocus
              />
              <button className="icon-btn" onClick={() => handleCreate('', createTarget.type)}>
                <Check size={12} />
              </button>
              <button className="icon-btn danger" onClick={() => setCreateTarget(null)}>
                <X size={12} />
              </button>
            </div>
          )}

          {treeData.length === 0 && !isCreatingRoot ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
              {t('empty_workspace')}
            </div>
          ) : (
            treeData.map(node => renderTreeNode(node))
          )}
        </div>
      </div>
    </div>
  );
}
