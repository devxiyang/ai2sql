import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/vs2015.css';

hljs.registerLanguage('sql', sql);

interface SQLMessageProps {
  sql: string;
  onCopy?: () => void;
}

const SQLMessage: React.FC<SQLMessageProps> = ({ sql, onCopy }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [sql]);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    }
    // 备用复制方案
    navigator.clipboard.writeText(sql).catch(console.error);
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="relative">
        <pre className="m-0 p-4 overflow-x-auto" style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
        }}>
          <code ref={codeRef} className="language-sql">{sql}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            fontFamily: 'var(--vscode-font-family)',
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
};

export default SQLMessage; 