import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SQLMessageProps {
  sql: string;
  onCopy?: () => void;
  loading?: boolean;
  streaming?: boolean;
}

const SQLMessage: React.FC<SQLMessageProps> = ({ sql, onCopy, loading = false, streaming = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      if (onCopy) {
        onCopy();
      }
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };

  // Loading animation component
  const LoadingDots = () => (
    <div className="flex items-center gap-1">
      <div className="animate-pulse">.</div>
      <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</div>
      <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</div>
    </div>
  );

  // Customize the VS Code Dark Plus theme
  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      margin: 0,
      fontSize: 'var(--vscode-editor-font-size, 13px)',
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      background: 'transparent',
      padding: 0,
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      whiteSpace: 'pre' as const,
      wordSpacing: 'normal' as const,
      wordBreak: 'normal' as const,
      wordWrap: 'normal' as const,
      lineHeight: 1.5,
      tabSize: 2,
    },
  };

  const showContent = sql.trim().length > 0 || loading || streaming;
  if (!showContent) {
    console.log('SQLMessage: Not showing content', { sql, loading, streaming });
    return null;
  }

  console.log('SQLMessage: Showing content', { sql, loading, streaming });

  return (
    <div className="flex flex-col my-2 border rounded-md overflow-hidden" style={{
      borderColor: 'var(--vscode-panel-border)',
      minHeight: loading ? '150px' : 'auto',
    }}>
      {/* File info bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs" style={{
        backgroundColor: 'var(--vscode-tab-inactiveBackground)',
      }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--vscode-tab-inactiveForeground)' }}>
            SQL Query {(loading || streaming) && <LoadingDots />}
          </span>
        </div>
        <div className="flex items-center">
          {sql.trim() && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
              style={{
                color: 'var(--vscode-tab-inactiveForeground)',
                background: copied ? 'var(--vscode-button-background)' : 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'inherit',
              }}
            >
              <span className="codicon codicon-copy" style={{ fontSize: '12px' }}></span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="p-4" style={{
        backgroundColor: 'var(--vscode-editor-background)',
      }}>
        {loading && !sql.trim() ? (
          <div className="flex items-center justify-center py-4" style={{
            color: 'var(--vscode-descriptionForeground)',
          }}>
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{
                borderColor: 'var(--vscode-textLink-foreground) transparent'
              }}></div>
              <span className="text-xs">Generating SQL{streaming ? '...' : ''}</span>
            </div>
          </div>
        ) : (
          <SyntaxHighlighter
            language="sql"
            style={customStyle}
            showLineNumbers={true}
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              background: 'transparent',
              minHeight: '2em',
            }}
            lineNumberStyle={{
              minWidth: '2em',
              paddingRight: '1em',
              textAlign: 'right',
              userSelect: 'none',
              opacity: 0.5,
              color: 'var(--vscode-editorLineNumber-foreground)',
            }}
          >
            {sql.trim()}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
};

export default SQLMessage; 