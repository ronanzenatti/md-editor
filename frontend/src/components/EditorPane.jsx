import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Code, Terminal,
  Table as TableIcon, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon,
  Smile, Activity, Undo, Redo, Save, Upload, AlertCircle, X, Check, Plus, Trash2, Edit2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EmojiPicker from './EmojiPicker';

const API_BASE = window.location.origin.includes('localhost:5173') 
  ? 'http://localhost:3001' 
  : window.location.origin;

const MERMAID_DIAGRAMS = [
  { id: 'flowchart', name: 'flowchart', sample: `graph TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -->|Yes| D[Result 1]\n  C -->|No| E[Result 2]` },
  { id: 'sequence', name: 'sequence', sample: `sequenceDiagram\n  Alice->>Bob: Hello Bob, how are you?\n  Bob-->>Alice: Jolly good!` },
  { id: 'class_diag', name: 'class_diag', sample: `classDiagram\n  Animal <|-- Duck\n  Animal <|-- Fish\n  Animal : +int age\n  Animal : +String gender\n  class Duck{\n    +String beakColor\n    +swim()\n  }` },
  { id: 'state_diag', name: 'state_diag', sample: `stateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still\n  Moving --> Crash\n  Crash --> [*]` },
  { id: 'er_diag', name: 'er_diag', sample: `erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains` },
  { id: 'gantt', name: 'gantt', sample: `gantt\n  title A Gantt Diagram\n  dateFormat YYYY-MM-DD\n  section Section\n  A task :a1, 2026-06-09, 30d\n  Another task :after a1, 20d` },
  { id: 'pie', name: 'pie', sample: `pie title Pets adopted by volunteers\n  "Dogs" : 386\n  "Cats" : 85\n  "Rats" : 15` },
  { id: 'git_graph', name: 'git_graph', sample: `gitGraph\n  commit\n  commit\n  branch hotfix\n  checkout hotfix\n  commit\n  checkout main\n  merge hotfix` }
];

const POPULAR_LANGUAGES = [
  { val: 'javascript', name: 'JavaScript' },
  { val: 'typescript', name: 'TypeScript' },
  { val: 'python', name: 'Python' },
  { val: 'html', name: 'HTML' },
  { val: 'css', name: 'CSS' },
  { val: 'sql', name: 'SQL' },
  { val: 'bash', name: 'Bash / Shell' },
  { val: 'json', name: 'JSON' },
  { val: 'java', name: 'Java' },
  { val: 'cpp', name: 'C++' },
  { val: 'csharp', name: 'C#' },
  { val: 'rust', name: 'Rust' },
  { val: 'go', name: 'Go' }
];

// Markdown Table to Columns/Rows Parser Helper
const parseMarkdownTable = (mdText) => {
  const lines = mdText.trim().split('\n').map(l => l.trim());
  if (lines.length < 2) return { cols: ['Header 1', 'Header 2'], rows: [['Texto', 'Texto']] };
  
  const parseRow = (line) => {
    let clean = line;
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map(cell => cell.trim());
  };
  
  const cols = parseRow(lines[0]);
  const rows = [];
  
  // Skip separator line (usually index 1)
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i]) continue;
    const rowCells = parseRow(lines[i]);
    while (rowCells.length < cols.length) {
      rowCells.push('Texto');
    }
    rows.push(rowCells.slice(0, cols.length));
  }
  
  return { cols, rows };
};

// Scan upwards and downwards to locate table range boundaries
const getTableRangeAtLine = (model, lineNum) => {
  const lineCount = model.getLineCount();
  const lineText = model.getLineContent(lineNum).trim();
  
  if (!lineText.includes('|')) return null;
  
  let startLine = lineNum;
  while (startLine > 1) {
    const prevLine = model.getLineContent(startLine - 1).trim();
    if (prevLine.includes('|')) {
      startLine--;
    } else {
      break;
    }
  }
  
  let endLine = lineNum;
  while (endLine < lineCount) {
    const nextLine = model.getLineContent(endLine + 1).trim();
    if (nextLine.includes('|')) {
      endLine++;
    } else {
      break;
    }
  }
  
  let hasSeparator = false;
  for (let i = startLine; i <= endLine; i++) {
    const content = model.getLineContent(i);
    if (content.includes('---')) {
      hasSeparator = true;
      break;
    }
  }
  
  if (hasSeparator) {
    return { startLine, endLine };
  }
  return null;
};

// Scan global code blocks to find if line is inside one
const getCodeBlockRangeAtLine = (model, lineNum) => {
  const lineCount = model.getLineCount();
  let blocks = [];
  let currentBlock = null;
  
  for (let i = 1; i <= lineCount; i++) {
    const line = model.getLineContent(i).trim();
    if (line.startsWith('```')) {
      if (currentBlock === null) {
        currentBlock = { startLine: i, lang: line.slice(3).trim().toLowerCase() };
      } else {
        currentBlock.endLine = i;
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }
  }
  
  for (const block of blocks) {
    if (lineNum >= block.startLine && lineNum <= block.endLine) {
      return block;
    }
  }
  return null;
};

export default function EditorPane({ filePath, initialContent, onContentChange, selectedTheme }) {
  const { t } = useLanguage();
  
  const [content, setContent] = useState(initialContent || '');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved', 'typing'
  const [autoSaveActive, setAutoSaveActive] = useState(() => {
    const saved = localStorage.getItem('autosave_active');
    return saved !== 'false';
  });

  // Modal triggers
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Code block modal
  const [showCodeBlockModal, setShowCodeBlockModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState('manual');
  const [manualLang, setManualLang] = useState('');

  // Mermaid modal
  const [showMermaidModal, setShowMermaidModal] = useState(false);

  // Table modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableCols, setTableCols] = useState(['Header 1', 'Header 2']);
  const [tableRows, setTableRows] = useState([['Texto', 'Texto']]);
  const [editingColIdx, setEditingColIdx] = useState(-1);
  const [editingColVal, setEditingColVal] = useState('');
  
  // Track range currently being edited in modal
  const [editRange, setEditRange] = useState(null); // { startLine, endLine }
  const [codeBlockText, setCodeBlockText] = useState('');
  const [editCodeBlockRange, setEditCodeBlockRange] = useState(null); // { startLine, endLine }
  const [mermaidText, setMermaidText] = useState('');
  const [editMermaidRange, setEditMermaidRange] = useState(null); // { startLine, endLine }

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkMode, setLinkMode] = useState('external'); // 'external' | 'repository' | 'upload'
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedRepoFile, setSelectedRepoFile] = useState('');
  const [linkUploadFile, setLinkUploadFile] = useState(null);
  const [uploadingLinkFile, setUploadingLinkFile] = useState(false);

  // Emoji picker popover state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const disposablesRef = useRef([]);
  const fileInputRef = useRef(null);
  const linkFileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Content ref to avoid stale closures in Monaco commands
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      disposablesRef.current.forEach(d => d.dispose());
    };
  }, []);

  // Sync editor content when initialContent changes from parent
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent || '');
    }
  }, [initialContent]);

  const toggleAutoSave = () => {
    setAutoSaveActive(prev => {
      const next = !prev;
      localStorage.setItem('autosave_active', next);
      if (!next && autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      return next;
    });
  };

  // Debounced autosave
  const triggerAutoSave = (newText) => {
    if (!autoSaveActive) {
      setSaveStatus('unsaved');
      return;
    }
    
    setSaveStatus('typing');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`${API_BASE}/api/files/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            content: newText
          })
        });
        const data = await res.json();
        if (data.success) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('unsaved');
        }
      } catch (err) {
        setSaveStatus('unsaved');
      }
    }, 5000);
  };

  // Manual save
  const handleManualSave = async () => {
    if (!filePath) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: contentRef.current })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
      }
    } catch (err) {
      setSaveStatus('unsaved');
    }
  };

  // Monaco insertion formatter
  const insertFormat = (before, after = '', placeholder = 'text') => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    
    const selection = editor.getSelection();
    const model = editor.getModel();
    const selectedText = model.getValueInRange(selection);
    
    const replacementText = before + (selectedText || placeholder) + after;
    
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );
    
    const op = {
      range: range,
      text: replacementText,
      forceMoveMarkers: true
    };
    
    editor.executeEdits("toolbar-insert", [op]);
    editor.focus();
    
    if (!selectedText && placeholder) {
      const startLine = selection.startLineNumber;
      const startCol = selection.startColumn + before.length;
      const endCol = startCol + placeholder.length;
      editor.setSelection(new monaco.Selection(startLine, startCol, startLine, endCol));
    }
    
    const newValue = model.getValue();
    setContent(newValue);
    onContentChange(newValue);
    triggerAutoSave(newValue);
  };

  // Insert emoji at cursor
  const insertEmoji = (emoji) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    
    const selection = editor.getSelection();
    const model = editor.getModel();
    
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );
    
    const op = {
      range: range,
      text: emoji,
      forceMoveMarkers: true
    };
    
    editor.executeEdits("emoji-insert", [op]);
    editor.focus();
    
    const newValue = model.getValue();
    setContent(newValue);
    onContentChange(newValue);
    triggerAutoSave(newValue);
    
    setShowEmojiPicker(false);
  };

  // Media Insertion
  const handleInsertMedia = (url) => {
    if (!url) return;
    
    if (mediaType === 'image') {
      insertFormat(`![Image Description](${url})`, '', '');
    } else {
      const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      const vimeoMatch = url.match(/(?:vimeo\.com\/)(?:channels\/[^\/]+\/|groups\/[^\/]+\/album\/\d+\/video\/|video\/|)(\d+)/i);

      if (ytMatch) {
        insertFormat(`<div class="video-embed-container">\n  <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>\n</div>`, '', '');
      } else if (vimeoMatch) {
        insertFormat(`<div class="video-embed-container">\n  <iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen></iframe>\n</div>`, '', '');
      } else {
        insertFormat(`<video src="${url}" controls></video>`, '', '');
      }
    }
    
    setMediaUrl('');
    setShowMediaModal(false);
  };

  // Upload File
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/upload?type=${mediaType}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        handleInsertMedia(data.path);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Code block insert/edit
  const handleInsertCodeBlock = () => {
    const lang = selectedLang === 'manual' ? manualLang.trim() : selectedLang;
    const finalLang = lang || 'javascript';
    const textValue = codeBlockText || '// code here';
    const text = `\n\`\`\`${finalLang}\n${textValue}\n\`\`\`\n`;
    
    if (editCodeBlockRange) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        const { startLine, endLine } = editCodeBlockRange;
        const model = editor.getModel();
        const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        
        const op = {
          range: range,
          text: `\`\`\`${finalLang}\n${textValue}\n\`\`\``,
          forceMoveMarkers: true
        };
        editor.executeEdits("codeblock-edit", [op]);
        
        const newValue = model.getValue();
        setContent(newValue);
        onContentChange(newValue);
        triggerAutoSave(newValue);
      }
      setEditCodeBlockRange(null);
    } else {
      insertFormat(text, '', '');
    }
    setShowCodeBlockModal(false);
    setManualLang('');
    setCodeBlockText('');
  };

  // Mermaid insert/edit
  const handleInsertMermaid = (codeToInsert) => {
    const finalCode = codeToInsert || mermaidText || `graph TD\n  A[Start] --> B(Process)`;
    const text = `\n\`\`\`mermaid\n${finalCode}\n\`\`\`\n`;
    
    if (editMermaidRange) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        const { startLine, endLine } = editMermaidRange;
        const model = editor.getModel();
        const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        
        const op = {
          range: range,
          text: `\`\`\`mermaid\n${finalCode}\n\`\`\``,
          forceMoveMarkers: true
        };
        editor.executeEdits("mermaid-edit", [op]);
        
        const newValue = model.getValue();
        setContent(newValue);
        onContentChange(newValue);
        triggerAutoSave(newValue);
      }
      setEditMermaidRange(null);
    } else {
      insertFormat(text, '', '');
    }
    setShowMermaidModal(false);
    setMermaidText('');
  };

  // Table builder operations
  const addColumn = () => {
    const colName = `Header ${tableCols.length + 1}`;
    setTableCols([...tableCols, colName]);
    setTableRows(tableRows.map(row => [...row, 'Texto']));
  };

  const removeColumn = (cIdx) => {
    if (tableCols.length <= 1) return;
    setTableCols(tableCols.filter((_, idx) => idx !== cIdx));
    setTableRows(tableRows.map(row => row.filter((_, idx) => idx !== cIdx)));
  };

  const addRow = () => {
    setTableRows([...tableRows, Array(tableCols.length).fill('Texto')]);
  };

  const removeRow = (rIdx) => {
    if (tableRows.length <= 1) return;
    setTableRows(tableRows.filter((_, idx) => idx !== rIdx));
  };

  const editRowCell = (rIdx, cIdx, val) => {
    const nextRows = [...tableRows];
    nextRows[rIdx] = [...nextRows[rIdx]];
    nextRows[rIdx][cIdx] = val;
    setTableRows(nextRows);
  };

  const saveColumnHeader = () => {
    if (editingColIdx !== -1 && editingColVal.trim()) {
      const nextCols = [...tableCols];
      nextCols[editingColIdx] = editingColVal.trim();
      setTableCols(nextCols);
      setEditingColIdx(-1);
      setEditingColVal('');
    }
  };

  // Table modal submit (handles creating a new table OR editing an existing range)
  const handleInsertTable = () => {
    let md = '\n';
    md += '| ' + tableCols.join(' | ') + ' |\n';
    md += '| ' + tableCols.map(() => '---').join(' | ') + ' |\n';
    tableRows.forEach(row => {
      md += '| ' + row.join(' | ') + ' |\n';
    });
    md += '\n';

    if (editRange) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        const { startLine, endLine } = editRange;
        const model = editor.getModel();
        const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        
        const op = {
          range: range,
          text: md,
          forceMoveMarkers: true
        };
        editor.executeEdits("table-edit", [op]);
        
        const newValue = model.getValue();
        setContent(newValue);
        onContentChange(newValue);
        triggerAutoSave(newValue);
      }
      setEditRange(null);
    } else {
      insertFormat(md, '', '');
    }
    
    setShowTableModal(false);
  };

  // Open Link Modal (loads repo files flat list)
  const openLinkModal = async () => {
    const editor = editorRef.current;
    let selected = '';
    if (editor) {
      const model = editor.getModel();
      const selection = editor.getSelection();
      selected = model.getValueInRange(selection);
    }
    setLinkText(selected || 'Link');
    setLinkUrl('');
    setLinkMode('external');
    setSelectedRepoFile('');
    setLinkUploadFile(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/files`);
      const data = await res.json();
      if (data.files) {
        const list = [];
        const flatten = (nodes) => {
          nodes.forEach(node => {
            if (node.isDir) {
              flatten(node.children || []);
            } else {
              list.push(node);
            }
          });
        };
        flatten(data.files);
        setRepoFiles(list);
        if (list.length > 0) {
          setSelectedRepoFile(list[0].relativePath);
        }
      }
    } catch (err) {
      console.error('Failed to load repo files for link selection:', err);
    }
    
    setShowLinkModal(true);
  };

  // Insert Link Handler (handles external link, repository file, or uploading to arquivos/)
  const handleInsertLink = async () => {
    let url = '';
    
    if (linkMode === 'external') {
      url = linkUrl.trim();
    } else if (linkMode === 'repository') {
      url = selectedRepoFile;
    } else if (linkMode === 'upload') {
      if (!linkUploadFile) {
        alert('Por favor, selecione um arquivo para upload.');
        return;
      }
      
      setUploadingLinkFile(true);
      const formData = new FormData();
      formData.append('file', linkUploadFile);
      
      try {
        const res = await fetch(`${API_BASE}/api/upload?type=file`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          url = data.path; // e.g. "arquivos/filename.ext"
        } else {
          alert(data.error || 'Upload failed');
          setUploadingLinkFile(false);
          return;
        }
      } catch (err) {
        alert(`Upload error: ${err.message}`);
        setUploadingLinkFile(false);
        return;
      }
      setUploadingLinkFile(false);
    }
    
    if (!url) {
      alert('Caminho ou URL inválido.');
      return;
    }
    
    const before = `[${linkText}](${url})`;
    insertFormat(before, '', '');
    
    setShowLinkModal(false);
    setLinkUploadFile(null);
  };

  // Native Monaco Providers Setup
  const setupMonacoProviders = (editor, monaco) => {
    // Clear legacy registrations
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // 1. CodeLens Provider
    const codeLensDisposable = monaco.languages.registerCodeLensProvider('markdown', {
      provideCodeLenses(model, token) {
        const lenses = [];
        const lineCount = model.getLineCount();
        
        // Scan for tables
        let inTable = false;
        let tableStart = -1;
        for (let i = 1; i <= lineCount; i++) {
          const line = model.getLineContent(i).trim();
          if (line.startsWith('|')) {
            if (!inTable) {
              if (i + 1 <= lineCount) {
                const nextLine = model.getLineContent(i + 1).trim();
                if (nextLine.includes('---')) {
                  inTable = true;
                  tableStart = i;
                }
              }
            }
          } else {
            if (inTable) {
              lenses.push({
                range: new monaco.Range(tableStart, 1, tableStart, 1),
                command: {
                  id: 'edit-table-command',
                  title: '📝 Editar Tabela via Modal / Edit Table',
                  arguments: [tableStart, i - 1]
                }
              });
              inTable = false;
            }
          }
        }
        if (inTable) {
          lenses.push({
            range: new monaco.Range(tableStart, 1, tableStart, 1),
            command: {
              id: 'edit-table-command',
              title: '📝 Editar Tabela via Modal / Edit Table',
              arguments: [tableStart, lineCount]
            }
          });
        }

        // Scan for fenced code blocks
        let inBlock = false;
        let blockStart = -1;
        let blockLang = '';
        for (let i = 1; i <= lineCount; i++) {
          const line = model.getLineContent(i).trim();
          if (line.startsWith('```')) {
            if (!inBlock) {
              inBlock = true;
              blockStart = i;
              blockLang = line.slice(3).trim().toLowerCase();
            } else {
              const title = blockLang === 'mermaid' 
                ? '📊 Editar Diagrama Mermaid / Edit Diagram' 
                : `💻 Editar Bloco de Código (${blockLang || 'text'}) / Edit Code`;
              const cmdId = blockLang === 'mermaid' ? 'edit-mermaid-command' : 'edit-code-block-command';
              
              lenses.push({
                range: new monaco.Range(blockStart, 1, blockStart, 1),
                command: {
                  id: cmdId,
                  title: title,
                  arguments: [blockStart, i]
                }
              });
              inBlock = false;
            }
          }
        }
        
        return {
          lenses: lenses,
          dispose: () => {}
        };
      },
      resolveCodeLens(model, codeLens, token) {
        return codeLens;
      }
    });
    
    disposablesRef.current.push(codeLensDisposable);

    // 2. Register Hover Provider
    const hoverDisposable = monaco.languages.registerHoverProvider('markdown', {
      provideHover(model, position) {
        const lineNum = position.lineNumber;
        
        const tableRange = getTableRangeAtLine(model, lineNum);
        if (tableRange) {
          return {
            range: new monaco.Range(tableRange.startLine, 1, tableRange.endLine, model.getLineMaxColumn(tableRange.endLine)),
            contents: [
              { value: '**Tabela Markdown Detectada**' },
              { value: `[📝 Clique aqui para editar via Modal / Click here to edit](command:edit-table-command?${encodeURIComponent(JSON.stringify([tableRange.startLine, tableRange.endLine]))})` }
            ]
          };
        }
        
        const blockRange = getCodeBlockRangeAtLine(model, lineNum);
        if (blockRange) {
          const isMermaid = blockRange.lang === 'mermaid';
          const title = isMermaid ? 'Diagrama Mermaid Detectado' : 'Bloco de Código Detectado';
          const cmd = isMermaid ? 'edit-mermaid-command' : 'edit-code-block-command';
          return {
            range: new monaco.Range(blockRange.startLine, 1, blockRange.endLine, model.getLineMaxColumn(blockRange.endLine)),
            contents: [
              { value: `**${title}**` },
              { value: `[📝 Clique aqui para editar via Modal / Click here to edit](command:${cmd}?${encodeURIComponent(JSON.stringify([blockRange.startLine, blockRange.endLine]))})` }
            ]
          };
        }
        return null;
      }
    });
    
    disposablesRef.current.push(hoverDisposable);

    // 3. Register Command Handlers
    const tableCmdDisposable = monaco.editor.registerCommand('edit-table-command', (accessor, startLine, endLine) => {
      const model = editor.getModel();
      const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
      const text = model.getValueInRange(range);
      
      const { cols, rows } = parseMarkdownTable(text);
      setTableCols(cols);
      setTableRows(rows);
      setEditRange({ startLine, endLine });
      setShowTableModal(true);
    });
    disposablesRef.current.push(tableCmdDisposable);

    const mermaidCmdDisposable = monaco.editor.registerCommand('edit-mermaid-command', (accessor, startLine, endLine) => {
      const model = editor.getModel();
      const lines = [];
      for (let i = startLine + 1; i < endLine; i++) {
        lines.push(model.getLineContent(i));
      }
      setMermaidText(lines.join('\n'));
      setEditMermaidRange({ startLine, endLine });
      setShowMermaidModal(true);
    });
    disposablesRef.current.push(mermaidCmdDisposable);

    const codeBlockCmdDisposable = monaco.editor.registerCommand('edit-code-block-command', (accessor, startLine, endLine) => {
      const model = editor.getModel();
      const firstLine = model.getLineContent(startLine).trim();
      const lang = firstLine.slice(3).trim();
      
      const lines = [];
      for (let i = startLine + 1; i < endLine; i++) {
        lines.push(model.getLineContent(i));
      }
      
      const matchedLang = POPULAR_LANGUAGES.find(l => l.val === lang.toLowerCase());
      if (matchedLang) {
        setSelectedLang(matchedLang.val);
      } else {
        setSelectedLang('manual');
        setManualLang(lang);
      }
      
      setCodeBlockText(lines.join('\n'));
      setEditCodeBlockRange({ startLine, endLine });
      setShowCodeBlockModal(true);
    });
    disposablesRef.current.push(codeBlockCmdDisposable);

    // 4. Register Context Menu Actions
    const tableAction = editor.addAction({
      id: 'edit-table-action',
      label: 'Editar Tabela via Modal',
      contextMenuOrder: 1,
      contextMenuGroupId: 'navigation',
      run: (ed) => {
        const pos = ed.getPosition();
        const model = ed.getModel();
        const tableRange = getTableRangeAtLine(model, pos.lineNumber);
        if (tableRange) {
          const range = new monaco.Range(tableRange.startLine, 1, tableRange.endLine, model.getLineMaxColumn(tableRange.endLine));
          const text = model.getValueInRange(range);
          const { cols, rows } = parseMarkdownTable(text);
          setTableCols(cols);
          setTableRows(rows);
          setEditRange(tableRange);
          setShowTableModal(true);
        } else {
          alert('O cursor não está posicionado dentro de uma tabela Markdown.');
        }
      }
    });
    disposablesRef.current.push({ dispose: () => tableAction.dispose() });

    const mermaidAction = editor.addAction({
      id: 'edit-mermaid-action',
      label: 'Editar Diagrama Mermaid via Modal',
      contextMenuOrder: 2,
      contextMenuGroupId: 'navigation',
      run: (ed) => {
        const pos = ed.getPosition();
        const model = ed.getModel();
        const blockRange = getCodeBlockRangeAtLine(model, pos.lineNumber);
        if (blockRange && blockRange.lang === 'mermaid') {
          const lines = [];
          for (let i = blockRange.startLine + 1; i < blockRange.endLine; i++) {
            lines.push(model.getLineContent(i));
          }
          setMermaidText(lines.join('\n'));
          setEditMermaidRange({ startLine: blockRange.startLine, endLine: blockRange.endLine });
          setShowMermaidModal(true);
        } else {
          alert('O cursor não está posicionado dentro de um bloco Mermaid.');
        }
      }
    });
    disposablesRef.current.push({ dispose: () => mermaidAction.dispose() });

    const codeBlockAction = editor.addAction({
      id: 'edit-code-block-action',
      label: 'Editar Bloco de Código via Modal',
      contextMenuOrder: 3,
      contextMenuGroupId: 'navigation',
      run: (ed) => {
        const pos = ed.getPosition();
        const model = ed.getModel();
        const blockRange = getCodeBlockRangeAtLine(model, pos.lineNumber);
        if (blockRange && blockRange.lang !== 'mermaid') {
          const firstLine = model.getLineContent(blockRange.startLine).trim();
          const lang = firstLine.slice(3).trim();
          
          const lines = [];
          for (let i = blockRange.startLine + 1; i < blockRange.endLine; i++) {
            lines.push(model.getLineContent(i));
          }
          
          const matchedLang = POPULAR_LANGUAGES.find(l => l.val === lang.toLowerCase());
          if (matchedLang) {
            setSelectedLang(matchedLang.val);
          } else {
            setSelectedLang('manual');
            setManualLang(lang);
          }
          
          setCodeBlockText(lines.join('\n'));
          setEditCodeBlockRange({ startLine: blockRange.startLine, endLine: blockRange.endLine });
          setShowCodeBlockModal(true);
        } else {
          alert('O cursor não está posicionado dentro de um bloco de código.');
        }
      }
    });
    disposablesRef.current.push({ dispose: () => codeBlockAction.dispose() });

    // 5. Add Mouse Listener for Double Click editing
    const mouseDisposable = editor.onMouseUp((e) => {
      if (e.event.detail === 2) {
        const pos = e.target.position;
        if (!pos) return;
        
        const model = editor.getModel();
        
        const tableRange = getTableRangeAtLine(model, pos.lineNumber);
        if (tableRange) {
          const range = new monaco.Range(tableRange.startLine, 1, tableRange.endLine, model.getLineMaxColumn(tableRange.endLine));
          const text = model.getValueInRange(range);
          const { cols, rows } = parseMarkdownTable(text);
          setTableCols(cols);
          setTableRows(rows);
          setEditRange(tableRange);
          setShowTableModal(true);
          return;
        }
        
        const blockRange = getCodeBlockRangeAtLine(model, pos.lineNumber);
        if (blockRange) {
          if (blockRange.lang === 'mermaid') {
            const lines = [];
            for (let i = blockRange.startLine + 1; i < blockRange.endLine; i++) {
              lines.push(model.getLineContent(i));
            }
            setMermaidText(lines.join('\n'));
            setEditMermaidRange({ startLine: blockRange.startLine, endLine: blockRange.endLine });
            setShowMermaidModal(true);
          } else {
            const firstLine = model.getLineContent(blockRange.startLine).trim();
            const lang = firstLine.slice(3).trim();
            
            const lines = [];
            for (let i = blockRange.startLine + 1; i < blockRange.endLine; i++) {
              lines.push(model.getLineContent(i));
            }
            
            const matchedLang = POPULAR_LANGUAGES.find(l => l.val === lang.toLowerCase());
            if (matchedLang) {
              setSelectedLang(matchedLang.val);
            } else {
              setSelectedLang('manual');
              setManualLang(lang);
            }
            
            setCodeBlockText(lines.join('\n'));
            setEditCodeBlockRange({ startLine: blockRange.startLine, endLine: blockRange.endLine });
            setShowCodeBlockModal(true);
          }
        }
      }
    });
    
    disposablesRef.current.push(mouseDisposable);
  };

  const handleEditorWillMount = (monaco) => {
    // VSCode Dark 2026 Theme loader
    monaco.editor.defineTheme('vscode-dark-2026', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '636e7b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f07178', fontStyle: 'bold' },
        { token: 'storage', foreground: 'f07178' },
        { token: 'string', foreground: 'c3e88d' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'constant', foreground: 'f78c6c' },
        { token: 'type', foreground: 'a179ff' },
        { token: 'class', foreground: 'a179ff' },
        { token: 'function', foreground: '4facfe' },
        { token: 'variable', foreground: 'e3e8f0' },
        { token: 'tag', foreground: 'f07178' },
        { token: 'attribute.name', foreground: '9cdcfe' },
        { token: 'attribute.value', foreground: 'c3e88d' },
        { token: 'tag.css', foreground: 'f07178' },
        { token: 'class.css', foreground: 'a179ff' },
        { token: 'id.css', foreground: 'a179ff' },
        { token: 'attribute.name.css', foreground: '9cdcfe' },
        { token: 'attribute.value.css', foreground: 'c3e88d' },
      ],
      colors: {
        'editor.background': '#0e1116',
        'editor.foreground': '#e3e8f0',
        'editorCursor.foreground': '#a179ff',
        'editor.lineHighlightBackground': '#181d24',
        'editorLineNumber.foreground': '#4e5868',
        'editor.selectionBackground': '#263449',
      }
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setupMonacoProviders(editor, monaco);

    // Register native Ctrl+S listener in Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleManualSave();
    });

    // Remeasure fonts once custom fonts (like Fira Code from Google Fonts) are loaded
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        monaco.editor.remeasureFonts();
      });
    }

    // Fail-safe backups for delayed font application
    setTimeout(() => {
      if (monacoRef.current) monacoRef.current.editor.remeasureFonts();
    }, 500);
    setTimeout(() => {
      if (monacoRef.current) monacoRef.current.editor.remeasureFonts();
    }, 2000);

    // Remeasure when the user focuses the editor text area as a live safeguard
    editor.onDidFocusEditorText(() => {
      if (monacoRef.current) monacoRef.current.editor.remeasureFonts();
    });
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', null);
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', null);
    }
  };

  if (!filePath) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dark)', gap: 12 }}>
        <AlertCircle size={48} />
        <span style={{ fontSize: '0.95rem' }}>{t('select_file_prompt')}</span>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button className="toolbar-btn" title="Bold" onClick={() => insertFormat('**', '**', 'strong text')}><Bold size={16} /></button>
        <button className="toolbar-btn" title="Italic" onClick={() => insertFormat('*', '*', 'italic text')}><Italic size={16} /></button>
        <button className="toolbar-btn" title="Strikethrough" onClick={() => insertFormat('~~', '~~', 'strikethrough text')}><Strikethrough size={16} /></button>
        
        <div className="toolbar-divider"></div>
        
        <button className="toolbar-btn" title="H1" onClick={() => insertFormat('# ', '', 'Heading 1')}><Heading1 size={16} /></button>
        <button className="toolbar-btn" title="H2" onClick={() => insertFormat('## ', '', 'Heading 2')}><Heading2 size={16} /></button>
        <button className="toolbar-btn" title="H3" onClick={() => insertFormat('### ', '', 'Heading 3')}><Heading3 size={16} /></button>
        
        <div className="toolbar-divider"></div>

        <button className="toolbar-btn" title="Bullet List" onClick={() => insertFormat('- ', '', 'List item')}><List size={16} /></button>
        <button className="toolbar-btn" title="Numbered List" onClick={() => insertFormat('1. ', '', 'List item')}><ListOrdered size={16} /></button>
        <button className="toolbar-btn" title="Task List" onClick={() => insertFormat('- [ ] ', '', 'Task item')}><CheckSquare size={16} /></button>
        <button className="toolbar-btn" title="Blockquote" onClick={() => insertFormat('> ', '', 'Quote text')}><Quote size={16} /></button>
        
        <div className="toolbar-divider"></div>

        {/* Code Block button -> Opens Modal */}
        <button className="toolbar-btn" title={t('code_block')} onClick={() => { setEditCodeBlockRange(null); setCodeBlockText(''); setShowCodeBlockModal(true); }}><Terminal size={16} /></button>
        <button className="toolbar-btn" title="Inline Code" onClick={() => insertFormat('`', '`', 'code')}><Code size={16} /></button>
        
        {/* Table button -> Opens Modal */}
        <button className="toolbar-btn" title={t('insert_table')} onClick={() => { setEditRange(null); setShowTableModal(true); }}><TableIcon size={16} /></button>
        <button className="toolbar-btn" title={t('insert_link')} onClick={openLinkModal}><LinkIcon size={16} /></button>
        
        {/* Emoji Button and Popover */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`toolbar-btn ${showEmojiPicker ? 'active' : ''}`} 
            title={t('emoji_picker_title') || 'Emojis'} 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <EmojiPicker 
              onSelect={insertEmoji} 
              onClose={() => setShowEmojiPicker(false)} 
            />
          )}
        </div>
        
        <div className="toolbar-divider"></div>

        <button 
          className="toolbar-btn" 
          title={t('insert_image')} 
          onClick={() => {
            setMediaType('image');
            setShowMediaModal(true);
          }}
        >
          <ImageIcon size={16} />
        </button>
        
        <button 
          className="toolbar-btn" 
          title={t('insert_video')} 
          onClick={() => {
            setMediaType('video');
            setShowMediaModal(true);
          }}
        >
          <VideoIcon size={16} />
        </button>

        {/* Mermaid button -> Opens Modal */}
        <button 
          className="toolbar-btn" 
          title={t('insert_mermaid')} 
          onClick={() => { setEditMermaidRange(null); setMermaidText(''); setShowMermaidModal(true); }}
        >
          <Activity size={16} />
        </button>

        <div className="toolbar-divider" style={{ marginLeft: 'auto' }}></div>

        <button className="toolbar-btn" title="Undo (CTRL+Z)" onClick={handleUndo}><Undo size={16} /></button>
        <button className="toolbar-btn" title="Redo" onClick={handleRedo}><Redo size={16} /></button>
        
        {/* Force manual Save button */}
        <button className="toolbar-btn" title={`${t('force_save')} (${t('save_shortcut')})`} onClick={handleManualSave}>
          <Save size={16} style={{ color: 'var(--color-primary-hover)' }} />
        </button>
      </div>

      {/* Unified Monaco Editor Area */}
      <div 
        className="editor-textarea-wrapper" 
        style={{ 
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <MonacoEditor
            height="100%"
            width="100%"
            language="markdown"
            theme={selectedTheme}
            value={content}
            onChange={(val) => {
              const newVal = val || '';
              setContent(newVal);
              onContentChange(newVal);
              triggerAutoSave(newVal);
            }}
            onMount={handleEditorDidMount}
            beforeMount={handleEditorWillMount}
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              fontFamily: "'Fira Code', source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace",
              fontLigatures: false,
              renderLineHighlight: 'all',
              wordWrap: 'on',
              scrollbar: { vertical: 'auto', horizontal: 'auto' }
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="editor-status-bar">
        <span>File: {filePath}</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Autosave Toggle Control */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={autoSaveActive} 
              onChange={toggleAutoSave}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('autosave_toggle')}</span>
          </label>

          <div className="toolbar-divider" style={{ height: 12, margin: 0 }}></div>

          <div className="save-indicator">
            {saveStatus === 'saved' && <span className="save-indicator saved"><Save size={12} /> {t('autosaved')}</span>}
            {saveStatus === 'saving' && <span className="save-indicator saving">{t('saving')}</span>}
            {saveStatus === 'typing' && <span className="save-indicator typing">{t('typing')}</span>}
            {saveStatus === 'unsaved' && <span className="save-indicator unsaved">{t('unsaved_changes')}</span>}
          </div>
        </div>
      </div>

      {/* Media Upload Modal */}
      {showMediaModal && (
        <div className="modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3>{mediaType === 'image' ? t('insert_image') : t('insert_video')}</h3>
              <button className="icon-btn" onClick={() => setShowMediaModal(false)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('enter_url')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder={mediaType === 'image' ? 'https://example.com/image.jpg' : 'YouTube, Vimeo or video URL'}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => handleInsertMedia(mediaUrl)}>{t('insert')}</button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }}></div>
                <span style={{ padding: '0 8px', fontSize: '0.75rem', color: 'var(--text-dark)' }}>{t('or')}</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }}></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                />
                <button 
                  className="btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={16} /> 
                  {uploading ? t('uploading') : (mediaType === 'image' ? t('choose_local_image') : t('choose_local_video'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Block selection Modal */}
      {showCodeBlockModal && (
        <div className="modal-overlay" onClick={() => { setShowCodeBlockModal(false); setEditCodeBlockRange(null); }}>
          <div className="modal-content glass-panel" style={{ maxWidth: 500, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3>{editCodeBlockRange ? 'Editar Bloco de Código / Edit Code Block' : t('code_block')}</h3>
              <button className="icon-btn" onClick={() => { setShowCodeBlockModal(false); setEditCodeBlockRange(null); }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('select_lang')}:</label>
                <select 
                  className="modal-input" 
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
                >
                  <option value="manual">{t('define_manually')}</option>
                  {POPULAR_LANGUAGES.map(lang => (
                    <option key={lang.val} value={lang.val}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {selectedLang === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('lang_label')}</label>
                  <input 
                    type="text"
                    className="modal-input"
                    placeholder="e.g. rust, ruby, php"
                    value={manualLang}
                    onChange={(e) => setManualLang(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Conteúdo do Código:</label>
                <textarea 
                  className="modal-input" 
                  style={{ minHeight: 180, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: 'var(--bg-input)', resize: 'vertical' }}
                  value={codeBlockText}
                  onChange={(e) => setCodeBlockText(e.target.value)}
                  placeholder="// code here"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => { setShowCodeBlockModal(false); setEditCodeBlockRange(null); }}>{t('cancel')}</button>
                <button className="btn-primary" onClick={handleInsertCodeBlock}>{editCodeBlockRange ? t('force_save') : t('insert')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Table builder Modal */}
      {showTableModal && (
        <div className="modal-overlay" onClick={() => { setShowTableModal(false); setEditRange(null); }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '80%', width: '80%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3>{editRange ? 'Editar Tabela / Edit Table' : t('insert_table')}</h3>
              <button className="icon-btn" onClick={() => { setShowTableModal(false); setEditRange(null); }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {/* Table Configuration Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={addColumn} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> {t('add_col')}
                </button>
                <button className="btn-secondary" onClick={addRow} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> {t('add_row')}
                </button>
              </div>

              {/* Editable Grid View */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8, backgroundColor: 'var(--bg-input)', maxHeight: 300 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {tableCols.map((col, cIdx) => (
                        <th key={cIdx} style={{ padding: 6, minWidth: 100, borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                          {editingColIdx === cIdx ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input 
                                type="text"
                                className="tree-rename-input"
                                value={editingColVal}
                                onChange={(e) => setEditingColVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveColumnHeader();
                                  if (e.key === 'Escape') setEditingColIdx(-1);
                                }}
                                autoFocus
                              />
                              <button className="icon-btn" onClick={saveColumnHeader}><Check size={12} /></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontSize: '0.85rem' }}>{col}</span>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <button 
                                  className="icon-btn" 
                                  title={t('edit_header')}
                                  onClick={() => {
                                    setEditingColIdx(cIdx);
                                    setEditingColVal(col);
                                  }}
                                >
                                  <Edit2 size={10} />
                                </button>
                                {tableCols.length > 1 && (
                                  <button className="icon-btn danger" onClick={() => removeColumn(cIdx)}><X size={10} /></button>
                                )}
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: 4 }}>
                            <input 
                              type="text"
                              className="tree-rename-input"
                              value={cell}
                              onChange={(e) => editRowCell(rIdx, cIdx, e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', backgroundColor: 'transparent' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: 4, textAlign: 'center' }}>
                          {tableRows.length > 1 && (
                            <button className="icon-btn danger" onClick={() => removeRow(rIdx)}><Trash2 size={12} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => { setShowTableModal(false); setEditRange(null); }}>{t('cancel')}</button>
                <button className="btn-primary" onClick={handleInsertTable}>{editRange ? t('force_save') : t('insert')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mermaid Modal */}
      {showMermaidModal && (
        <div className="modal-overlay" onClick={() => { setShowMermaidModal(false); setEditMermaidRange(null); }}>
          <div className="modal-content glass-panel" style={{ maxWidth: 600, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3>{editMermaidRange ? 'Editar Diagrama / Edit Diagram' : t('insert_mermaid')}</h3>
              <button className="icon-btn" onClick={() => { setShowMermaidModal(false); setEditMermaidRange(null); }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {/* Presets List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('select_mermaid_type')}:</label>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {MERMAID_DIAGRAMS.map((diag) => (
                    <button
                      key={diag.id}
                      type="button"
                      className="toggle-view-btn"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 6, whiteSpace: 'nowrap' }}
                      onClick={() => setMermaidText(diag.sample)}
                    >
                      {t(diag.id)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mermaid Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Código do Diagrama:</label>
                <textarea 
                  className="modal-input" 
                  style={{ minHeight: 180, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: 'var(--bg-input)', resize: 'vertical' }}
                  value={mermaidText}
                  onChange={(e) => setMermaidText(e.target.value)}
                  placeholder="graph TD..."
                />
              </div>
              
              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => { setShowMermaidModal(false); setEditMermaidRange(null); }}>{t('cancel')}</button>
                <button className="btn-primary" onClick={() => handleInsertMermaid(mermaidText)}>{editMermaidRange ? t('force_save') : t('insert')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Builder Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
              <h3>{t('insert_link')}</h3>
              <button className="icon-btn" onClick={() => setShowLinkModal(false)}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
              {/* Link Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('link_text')}</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  value={linkText} 
                  onChange={(e) => setLinkText(e.target.value)} 
                  placeholder="Link"
                />
              </div>

              {/* Link Mode Tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('link_mode')}</label>
                <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                  <button 
                    type="button"
                    className={`toggle-view-btn ${linkMode === 'external' ? 'active' : ''}`}
                    onClick={() => setLinkMode('external')}
                    style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', borderRadius: 6 }}
                  >
                    {t('link_mode_external')}
                  </button>
                  <button 
                    type="button"
                    className={`toggle-view-btn ${linkMode === 'repository' ? 'active' : ''}`}
                    onClick={() => setLinkMode('repository')}
                    style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', borderRadius: 6 }}
                  >
                    {t('link_mode_repo')}
                  </button>
                  <button 
                    type="button"
                    className={`toggle-view-btn ${linkMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setLinkMode('upload')}
                    style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', borderRadius: 6 }}
                  >
                    {t('link_mode_upload')}
                  </button>
                </div>
              </div>

              {/* Mode-specific Input Option */}
              {linkMode === 'external' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>URL:</label>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder={t('link_external_placeholder')}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
              )}

              {linkMode === 'repository' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('link_file_select')}</label>
                  <select 
                    className="modal-input" 
                    value={selectedRepoFile}
                    onChange={(e) => setSelectedRepoFile(e.target.value)}
                    style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
                  >
                    {repoFiles.length === 0 ? (
                      <option value="">{t('empty_workspace')}</option>
                    ) : (
                      repoFiles.map(file => (
                        <option key={file.relativePath} value={file.relativePath}>{file.relativePath}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {linkMode === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('link_file_upload')}</label>
                  <input 
                    type="file" 
                    ref={linkFileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => setLinkUploadFile(e.target.files[0])}
                  />
                  <button 
                    type="button"
                    className="btn-secondary" 
                    onClick={() => linkFileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                  >
                    <Upload size={16} />
                    {linkUploadFile ? linkUploadFile.name : t('choose_file')}
                  </button>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => setShowLinkModal(false)}>{t('cancel')}</button>
                <button className="btn-primary" onClick={handleInsertLink} disabled={uploadingLinkFile}>
                  {uploadingLinkFile ? t('uploading_file') : t('insert')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
