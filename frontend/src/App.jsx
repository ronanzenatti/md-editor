import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, GitBranch, LayoutGrid, FileText, 
  Terminal, Eye, LogOut, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

import WorkspaceSelector from './components/WorkspaceSelector';
import RepoManager from './components/RepoManager';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';

const API_BASE = window.location.origin.includes('localhost:5173') 
  ? 'http://localhost:3001' 
  : window.location.origin;

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [workspace, setWorkspace] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('editor_theme') || 'vscode-dark-2026';
  });

  const handleThemeChange = (themeName) => {
    setSelectedTheme(themeName);
    localStorage.setItem('editor_theme', themeName);
  };
  
  // Resizable Panels States
  // Indexes: 0 = RepoManager, 1 = Editor, 2 = Preview
  const [panelWidths, setPanelWidths] = useState([20, 40, 40]);
  const [panelVisible, setPanelVisible] = useState([true, true, true]);
  
  const containerRef = useRef(null);

  // Check if workspace is already open on mount
  useEffect(() => {
    const checkWorkspace = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/workspace`);
        const data = await res.json();
        if (data.activeWorkspace) {
          setWorkspace(data.activeWorkspace);
        }
      } catch (err) {
        console.error('Backend server offline or unreachable.');
      }
    };
    checkWorkspace();
  }, []);

  const handleWorkspaceSelected = (path) => {
    setWorkspace(path);
    setActiveFile(null);
    setFileContent('');
  };

  const handleFileSelected = async (filePath) => {
    setActiveFile(filePath);
    if (!filePath) {
      setFileContent('');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/files/read?filePath=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setActiveFile(null);
        setFileContent('');
      } else {
        setFileContent(data.content || '');
      }
    } catch (err) {
      alert(`Error loading file: ${err.message}`);
    }
  };

  // Close workspace and reset selection
  const handleCloseWorkspace = () => {
    setWorkspace(null);
    setActiveFile(null);
    setFileContent('');
  };

  // Panel toggles
  const togglePanel = (idx) => {
    const nextVisible = [...panelVisible];
    nextVisible[idx] = !nextVisible[idx];
    
    const visibleCount = nextVisible.filter(Boolean).length;
    if (visibleCount < 1) return; // At least one panel must stay visible
    
    setPanelVisible(nextVisible);
    
    // Recalculate widths
    const nextWidths = [...panelWidths];
    if (visibleCount === 3) {
      setPanelWidths([20, 40, 40]);
    } else if (visibleCount === 2) {
      const visibleIndices = nextVisible.map((v, i) => v ? i : -1).filter(i => i !== -1);
      const first = visibleIndices[0];
      const second = visibleIndices[1];
      
      if (first === 0 && second === 1) {
        nextWidths[0] = 25;
        nextWidths[1] = 75;
        nextWidths[2] = 0;
      } else if (first === 1 && second === 2) {
        nextWidths[0] = 0;
        nextWidths[1] = 50;
        nextWidths[2] = 50;
      } else if (first === 0 && second === 2) {
        nextWidths[0] = 30;
        nextWidths[1] = 0;
        nextWidths[2] = 70;
      }
      setPanelWidths(nextWidths);
    } else if (visibleCount === 1) {
      const activeIdx = nextVisible.findIndex(Boolean);
      nextWidths[0] = 0;
      nextWidths[1] = 0;
      nextWidths[2] = 0;
      nextWidths[activeIdx] = 100;
      setPanelWidths(nextWidths);
    }
  };

  // Custom resizing handler
  const startResize = (splitterIdx, e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    const startX = e.clientX;
    const startWidths = [...panelWidths];

    // Find the left and right visible panels around the splitter
    let leftIdx = -1;
    let rightIdx = -1;

    if (splitterIdx === 0) {
      leftIdx = 0;
      // Right is index 1 if visible, else 2
      rightIdx = panelVisible[1] ? 1 : 2;
    } else {
      // Left is index 1 if visible, else 0
      leftIdx = panelVisible[1] ? 1 : 0;
      rightIdx = 2;
    }

    if (leftIdx === -1 || rightIdx === -1 || !panelVisible[leftIdx] || !panelVisible[rightIdx]) {
      return;
    }

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newWidths = [...startWidths];
      const sum = startWidths[leftIdx] + startWidths[rightIdx];
      let newLeft = startWidths[leftIdx] + deltaPercent;
      let newRight = startWidths[rightIdx] - deltaPercent;

      // Restrict minimum size to 10%
      if (newLeft >= 10 && newRight >= 10) {
        newWidths[leftIdx] = newLeft;
        newWidths[rightIdx] = newRight;
        setPanelWidths(newWidths);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('resizing');
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.classList.add('resizing');
  };

  // Render toggle panel control buttons
  const renderToggleButtons = () => {
    const visibleCount = panelVisible.filter(Boolean).length;
    
    return (
      <div className="panel-toggle-group">
        <button 
          className={`toggle-view-btn ${panelVisible[0] ? 'active' : ''}`}
          onClick={() => togglePanel(0)}
          disabled={panelVisible[0] && visibleCount === 1}
        >
          <FolderOpen size={13} />
          {t('repository')}
        </button>
        <button 
          className={`toggle-view-btn ${panelVisible[1] ? 'active' : ''}`}
          onClick={() => togglePanel(1)}
          disabled={panelVisible[1] && visibleCount === 1}
        >
          <Terminal size={13} />
          {t('editor')}
        </button>
        <button 
          className={`toggle-view-btn ${panelVisible[2] ? 'active' : ''}`}
          onClick={() => togglePanel(2)}
          disabled={panelVisible[2] && visibleCount === 1}
        >
          <Eye size={13} />
          {t('preview')}
        </button>
      </div>
    );
  };

  if (!workspace) {
    return <WorkspaceSelector onWorkspaceSelected={handleWorkspaceSelected} />;
  }

  // Determine splitters rendering
  // Splitter 1 is between panel 0 and whichever is visible next (1 or 2)
  const showSplitter1 = panelVisible[0] && (panelVisible[1] || panelVisible[2]);
  // Splitter 2 is between panel 1 and 2
  const showSplitter2 = panelVisible[1] && panelVisible[2];

  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 className="app-title">
            <LayoutGrid size={20} />
            {t('title')}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Language Switcher Button */}
          <button 
            className="toggle-view-btn active"
            onClick={() => setLanguage(language === 'pt-BR' ? 'en' : 'pt-BR')}
            style={{ borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Mudar Idioma / Change Language"
          >
            {language === 'pt-BR' ? '🇧🇷 PT-BR' : '🇺🇸 EN'}
          </button>
          
          {renderToggleButtons()}
          
          <button 
            className="icon-btn danger" 
            onClick={handleCloseWorkspace}
            title={t('close_workspace')}
            style={{ padding: 6, borderRadius: 8 }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main workspace panels */}
      <main className="app-body">
        <div ref={containerRef} className="panel-container">
          
          {/* Panel 1: Repository Manager */}
          {panelVisible[0] && (
            <div className="app-panel" style={{ flex: `${panelWidths[0]} 1 0%` }}>
              <div className="panel-header">
                <span className="panel-title">{t('repo_manager')}</span>
              </div>
              <RepoManager 
                activeFile={activeFile}
                onFileSelected={handleFileSelected}
                workspacePath={workspace}
              />
            </div>
          )}

          {/* Splitter 1 */}
          {showSplitter1 && (
            <div 
              className="panel-splitter" 
              onMouseDown={(e) => startResize(0, e)}
            />
          )}

          {/* Panel 2: Editor */}
          {panelVisible[1] && (
            <div className="app-panel" style={{ flex: `${panelWidths[1]} 1 0%` }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="panel-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>
                  {t('editor')}
                  {activeFile && ` • ${activeFile.split(/[/\\]/).pop()}`}
                </span>
                
                {/* Theme Selector always aligned to the right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Theme:</span>
                  <select 
                    value={selectedTheme} 
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="tree-rename-input"
                    style={{ width: 'auto', padding: '2px 6px', fontSize: '0.72rem', height: 'auto', border: '1px solid var(--border-light)', cursor: 'pointer', background: 'var(--bg-input)' }}
                  >
                    <option value="vscode-dark-2026">VSCode Dark 2026</option>
                    <option value="vs-dark">VS Code Dark</option>
                    <option value="vs">VS Code Light</option>
                    <option value="hc-black">High Contrast</option>
                  </select>
                </div>
              </div>
              <EditorPane 
                key={activeFile}
                filePath={activeFile}
                initialContent={fileContent}
                onContentChange={setFileContent}
                selectedTheme={selectedTheme}
              />
            </div>
          )}

          {/* Splitter 2 */}
          {showSplitter2 && (
            <div 
              className="panel-splitter" 
              onMouseDown={(e) => startResize(1, e)}
            />
          )}

          {/* Panel 3: Live Preview */}
          {panelVisible[2] && (
            <div className="app-panel" style={{ flex: `${panelWidths[2]} 1 0%` }}>
              <div className="panel-header">
                <span className="panel-title">{t('preview')}</span>
              </div>
              <PreviewPane 
                content={fileContent}
                workspacePath={workspace}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
