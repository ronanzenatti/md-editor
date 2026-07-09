import React, { useState, useEffect } from 'react';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

import 'highlight.js/styles/github-dark.css';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  logLevel: 5
});

// Helper to escape HTML characters
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function PreviewPane({ content, workspacePath }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!content) {
      setHtml('');
      return;
    }

    const markedObj = new Marked();
    const renderer = {
      // Intercept code blocks for Mermaid and highlight.js
      code(codeObj) {
        const text = codeObj.text || '';
        const rawLang = codeObj.lang || '';
        
        // Clean and normalize the language tag (e.g. "js" or "javascript")
        let lang = rawLang.trim().split(/\s+/)[0].toLowerCase();
        
        if (lang === 'mermaid') {
          // Put the raw code in a pending div
          return `<div class="mermaid-preview"><div class="mermaid-pending" data-code="${escapeHtml(text)}">Loading diagram...</div></div>`;
        }
        
        let highlighted = '';
        let hasHighlight = false;
        
        if (lang) {
          if (lang === 'js') lang = 'javascript';
          if (lang === 'ts') lang = 'typescript';
          if (lang === 'py') lang = 'python';
          
          if (hljs.getLanguage(lang)) {
            try {
              highlighted = hljs.highlight(text, { language: lang }).value;
              hasHighlight = true;
            } catch (err) {
              console.error('Highlight failed:', err);
            }
          }
        }
        
        if (!hasHighlight) {
          try {
            // Automatically detect the code language if not specified or unrecognized
            const autoRes = hljs.highlightAuto(text);
            highlighted = autoRes.value;
            lang = autoRes.language || '';
          } catch (err) {
            highlighted = escapeHtml(text);
          }
        }
        
        return `<pre><code class="hljs lang-${lang}">${highlighted}</code></pre>`;
      },
      
      // Map local images relative to workspace to the active server /media endpoint
      image(imageObj) {
        let src = imageObj.href || '';
        const alt = imageObj.text || '';
        const title = imageObj.title || '';
        
        // If image is a local path (e.g. imgs/file.png), map it to /media/imgs/file.png
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          // Ensure it routes to our server's static media endpoint
          src = `http://localhost:3001/media/${src.replace(/^\//, '')}`;
        }
        
        return `<img src="${src}" alt="${alt}" ${title ? `title="${title}"` : ''} />`;
      }
    };

    markedObj.use({ renderer });
    
    // Parse markdown synchronously
    try {
      const parsed = markedObj.parse(content);
      // Wait, marked 15.0.0 markedObj.parse can be sync if options are sync, or it is a Promise.
      // Let's resolve it if it's a promise, or check if it's a string.
      if (parsed instanceof Promise) {
        parsed.then(res => {
          setHtml(res);
        });
      } else {
        setHtml(parsed);
      }
    } catch (err) {
      setHtml(`<div style="color:var(--color-danger)">Parsing Error: ${err.message}</div>`);
    }
  }, [content]);

  // Handle asynchronous Mermaid rendering
  useEffect(() => {
    if (!html) return;

    const renderMermaid = async () => {
      // Find all pending diagrams
      const pendingElements = document.querySelectorAll('.mermaid-pending');
      
      for (const el of pendingElements) {
        const code = el.getAttribute('data-code');
        if (!code) continue;

        // Generate unique ID for rendering
        const id = `mermaid-svg-${Math.floor(Math.random() * 1000000)}`;
        
        try {
          // Clear element first
          el.innerHTML = '<span style="font-size:0.8rem;color:var(--text-dark)">Rendering...</span>';
          
          const { svg } = await mermaid.render(id, code);
          
          el.innerHTML = svg;
          el.classList.remove('mermaid-pending');
          el.classList.add('mermaid-rendered');
        } catch (err) {
          console.warn('Mermaid rendering syntax error:', err);
          // Insert error message inline without breaking the app
          el.innerHTML = `<div style="font-size: 0.8rem; color: var(--color-danger); padding: 8px; border: 1px dashed var(--color-danger); border-radius: 4px; background: rgba(239, 68, 68, 0.05)">
            ⚠️ Diagram Syntax Error
          </div>`;
          el.classList.remove('mermaid-pending');
          
          // Clean up potential leftover elements in document created by mermaid
          const badSvg = document.getElementById(id);
          if (badSvg) badSvg.remove();
        }
      }
    };

    // Wait a brief tick for react to paint the HTML, then render diagram
    const timer = setTimeout(() => {
      renderMermaid();
    }, 50);

    return () => clearTimeout(timer);
  }, [html]);

  return (
    <div className="panel-content">
      <div 
        className="markdown-body" 
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
