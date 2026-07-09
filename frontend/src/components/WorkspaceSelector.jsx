import React, { useState, useEffect } from 'react';
import { GitBranch, Loader2, Link2, KeyRound, AlertCircle, CheckCircle, Monitor, FolderOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE = window.location.origin.includes('localhost:5173') 
  ? 'http://localhost:3001' 
  : window.location.origin;

export default function WorkspaceSelector({ onWorkspaceSelected }) {
  const { t } = useLanguage();
  const [isElectron, setIsElectron] = useState(false);
  
  // Clone form states
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if running in Electron environment
    if (window.electronAPI && window.electronAPI.isElectron) {
      setIsElectron(true);
    }
  }, []);

  const handleSelectElectron = async () => {
    setLoading(true);
    setError('');
    try {
      const selectedPath = await window.electronAPI.selectFolder();
      if (selectedPath) {
        await setWorkspaceOnServer(selectedPath);
      }
    } catch (err) {
      setError(`Falha ao selecionar pasta no Electron: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setWorkspaceOnServer = async (folderPath) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        setStatusMessage('Pasta carregada com sucesso!');
        setTimeout(() => {
          onWorkspaceSelected(data.workspace);
        }, 1000);
      }
    } catch (err) {
      setError(`Erro ao definir repositório: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('A URL do repositório é obrigatória.');
      return;
    }

    if (!repoUrl.startsWith('https://') && !repoUrl.startsWith('http://')) {
      setError('Por favor, insira uma URL Git válida com protocolo HTTPS.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    setStatusMessage(t('cloning'));

    try {
      const res = await fetch(`${API_BASE}/api/workspace/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || 'main',
          token: token.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setStatusMessage(data.message || 'Repositório clonado com sucesso!');
        setTimeout(() => {
          onWorkspaceSelected(data.workspace);
        }, 1200);
      } else {
        setError(data.error || 'Falha ao clonar o repositório. Verifique a URL e as permissões.');
      }
    } catch (err) {
      setError(`Erro na requisição: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-overlay">
      <div className="setup-card glass-panel" style={{ maxWidth: 520, padding: 30 }}>
        
        {isElectron ? (
          /* Desktop (Electron) Mode: Select Local Folder */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'var(--color-primary-glow)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FolderOpen size={28} style={{ color: 'var(--color-primary-hover)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {t('select_folder_title') || 'Selecione uma pasta para trabalhar'}
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Monitor size={12} />
                  {t('running_desktop') || 'Executando em Modo Desktop (Electron)'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-muted)' }}>
              {t('git_warning')}
            </p>

            {error && (
              <div style={{ 
                color: 'var(--color-danger)', 
                fontSize: '0.85rem', 
                backgroundColor: 'hsla(350, 80%, 55%, 0.08)', 
                padding: '12px 16px', 
                borderRadius: 8, 
                border: '1px solid hsla(350, 80%, 55%, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                color: 'var(--color-success)', 
                fontSize: '0.85rem', 
                backgroundColor: 'hsla(142, 70%, 45%, 0.08)', 
                padding: '12px 16px', 
                borderRadius: 8, 
                border: '1px solid hsla(142, 70%, 45%, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{statusMessage}</span>
              </div>
            )}

            <button 
              className="btn-primary" 
              onClick={handleSelectElectron} 
              disabled={loading || success}
              style={{ 
                width: '100%', 
                height: 42,
                borderRadius: 8,
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8,
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <FolderOpen size={18} />
                  <span>{t('select_folder_pc') || 'Selecionar Pasta do Computador'}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Web Browser Mode: Clone Git Repository */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
              <div style={{
                background: 'var(--color-primary-glow)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GitBranch size={28} style={{ color: 'var(--color-primary-hover)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {t('select_folder') || 'Clonar Repositório Git para Iniciar'}
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Markdown Git Editor Cloud
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-muted)', marginBottom: 20 }}>
              {t('git_warning')}
            </p>

            {error && (
              <div style={{ 
                color: 'var(--color-danger)', 
                fontSize: '0.85rem', 
                backgroundColor: 'hsla(350, 80%, 55%, 0.08)', 
                padding: '12px 16px', 
                borderRadius: 8, 
                border: '1px solid hsla(350, 80%, 55%, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 20
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                color: 'var(--color-success)', 
                fontSize: '0.85rem', 
                backgroundColor: 'hsla(142, 70%, 45%, 0.08)', 
                padding: '12px 16px', 
                borderRadius: 8, 
                border: '1px solid hsla(142, 70%, 45%, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handleClone} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Repository URL Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={13} />
                  {t('repo_url')}
                </label>
                <input
                  type="text"
                  className="modal-input"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={t('repo_url_placeholder') || 'https://github.com/...'}
                  disabled={loading || success}
                  required
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    color: 'var(--text-main)',
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
              </div>

              {/* Branch & Access Token Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
                {/* Branch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Branch
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    disabled={loading || success}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      color: 'var(--text-main)',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Token */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <KeyRound size={13} />
                    {t('git_token')}
                  </label>
                  <input
                    type="password"
                    className="modal-input"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t('token_placeholder') || 'Opcional para repositórios privados'}
                    disabled={loading || success}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      color: 'var(--text-main)',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ height: 10 }} />

              {/* Submit Button */}
              <button 
                type="submit"
                className="btn-primary" 
                disabled={loading || success || !repoUrl.trim()}
                style={{ 
                  width: '100%', 
                  height: 42,
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{statusMessage}</span>
                  </>
                ) : (
                  <>
                    <GitBranch size={18} />
                    <span>{t('clone_btn')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
