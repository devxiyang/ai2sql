import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SQLMessageProps {
  sql: string;
  onCopy?: () => void;
}

const SQLMessage: React.FC<SQLMessageProps> = ({ sql, onCopy }) => {
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

  return (
    <div className="flex flex-col my-2 border rounded-md overflow-hidden" style={{
      borderColor: 'var(--vscode-panel-border)',
    }}>
      {/* File info bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs" style={{
        backgroundColor: 'var(--vscode-tab-inactiveBackground)',
      }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--vscode-tab-inactiveForeground)' }}>
            SQL Query
          </span>
        </div>
        <div className="flex items-center">
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
        </div>
      </div>

      {/* Code content */}
      <div className="p-4" style={{
        backgroundColor: 'var(--vscode-editor-background)',
      }}>
        <SyntaxHighlighter
          language="sql"
          style={customStyle}
          showLineNumbers={true}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            background: 'transparent',
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
          {sql}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default SQLMessage; 