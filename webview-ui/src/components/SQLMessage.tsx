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

  // Format SQL by removing extra spaces and normalizing line breaks
  const formatSQL = (sql: string) => {
    return sql
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\s*([,()])\s*/g, '$1 ')  // Add space after commas and parentheses
      .replace(/\s+(FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|GROUP BY|ORDER BY|HAVING|LIMIT)\s+/gi, '\n$1 ')  // Add newlines before major clauses
      .replace(/^\s+|\s+$/g, '');  // Trim leading/trailing whitespace
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
      padding: '12px 16px',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      whiteSpace: 'pre' as const,
      wordSpacing: 'normal' as const,
      wordBreak: 'normal' as const,
      wordWrap: 'normal' as const,
      lineHeight: 1.5,
      tabSize: 4,
    },
  };

  return (
    <div className="rounded-md overflow-hidden border border-[var(--vscode-panel-border)]">
      <div className="flex justify-between items-center px-3 py-1.5" style={{
        backgroundColor: 'var(--vscode-titleBar-activeBackground)',
        borderBottom: '1px solid var(--vscode-panel-border)',
      }}>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60" style={{
            color: 'var(--vscode-titleBar-activeForeground)',
            fontFamily: 'var(--vscode-font-family)',
          }}>
            SQL Query
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded text-xs transition-opacity hover:bg-[var(--vscode-button-hoverBackground)]"
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
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language="sql"
          style={customStyle}
          showLineNumbers={true}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            background: 'var(--vscode-editor-background)',
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            opacity: 0.5,
            color: 'var(--vscode-editorLineNumber-foreground)',
          }}
        >
          {formatSQL(sql)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default SQLMessage; 