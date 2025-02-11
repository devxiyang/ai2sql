import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SQLMessageProps {
  sql: string;
  onCopy?: () => void;
}

const SQLMessage: React.FC<SQLMessageProps> = ({ sql, onCopy }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      if (onCopy) {
        onCopy();
      }
    }).catch(console.error);
  };

  // Customize the VS Code Dark Plus theme
  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      margin: 0,
      fontSize: 'var(--vscode-editor-font-size, 13px)',
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      background: 'var(--vscode-editor-background)',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
    },
  };

  return (
    <div className="rounded-md overflow-hidden" style={{
      backgroundColor: 'var(--vscode-editor-background)',
      border: '1px solid var(--vscode-panel-border)',
    }}>
      <div className="relative">
        <div className="flex justify-between items-center px-3 py-1.5" style={{
          backgroundColor: 'var(--vscode-titleBar-activeBackground)',
          borderBottom: '1px solid var(--vscode-panel-border)',
        }}>
          <span className="text-xs" style={{
            color: 'var(--vscode-titleBar-activeForeground)',
            fontFamily: 'var(--vscode-font-family)',
          }}>
            SQL Query
          </span>
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              fontFamily: 'var(--vscode-font-family)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Copy
          </button>
        </div>
        <div className="p-3">
          <SyntaxHighlighter
            language="sql"
            style={customStyle}
            customStyle={{
              margin: 0,
              padding: 0,
              background: 'var(--vscode-editor-background)',
            }}
          >
            {sql}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

export default SQLMessage; 