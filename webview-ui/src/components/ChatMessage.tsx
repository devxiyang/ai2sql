import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  const isSQL = !isUser && (
    message.toUpperCase().includes('SELECT') ||
    message.toUpperCase().includes('INSERT') ||
    message.toUpperCase().includes('UPDATE') ||
    message.toUpperCase().includes('DELETE') ||
    message.toUpperCase().includes('CREATE') ||
    message.toUpperCase().includes('ALTER')
  );

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={{
          backgroundColor: isUser 
            ? 'var(--vscode-button-background)' 
            : 'var(--vscode-editor-selectionBackground)',
          color: isUser 
            ? 'var(--vscode-button-foreground)' 
            : 'var(--vscode-editor-foreground)',
          fontFamily: 'var(--vscode-font-family)',
          fontSize: 'var(--vscode-font-size, 13px)',
          border: '1px solid var(--vscode-panel-border)',
        }}
      >
        {isSQL ? (
          <SQLMessage sql={message} />
        ) : (
          <div className="markdown-body" style={{
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
          }}>
            <ReactMarkdown
              components={{
                code: ({node, inline, className, children, ...props}: CodeProps) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <div className="rounded-md overflow-hidden my-2" style={{
                        border: '1px solid var(--vscode-panel-border)',
                      }}>
                        <div className="flex justify-between items-center px-3 py-1.5" style={{
                          backgroundColor: 'var(--vscode-titleBar-activeBackground)',
                          borderBottom: '1px solid var(--vscode-panel-border)',
                        }}>
                          <span className="text-xs" style={{
                            color: 'var(--vscode-titleBar-activeForeground)',
                            fontFamily: 'var(--vscode-font-family)',
                          }}>
                            {language.toUpperCase()}
                          </span>
                        </div>
                        <SyntaxHighlighter
                          language={language}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '0.75rem',
                            background: 'var(--vscode-editor-background)',
                            fontSize: 'var(--vscode-editor-font-size, 13px)',
                            fontFamily: 'var(--vscode-editor-font-family, monospace)',
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  
                  return (
                    <code
                      className={className}
                      style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        padding: '0.2em 0.4em',
                        borderRadius: '3px',
                        fontSize: '85%',
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        )}
        {timestamp && (
          <div 
            className="text-xs mt-2 text-right"
            style={{
              color: isUser 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-descriptionForeground)',
              opacity: 0.8
            }}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 