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
    <div className="px-4 py-2 hover:bg-[var(--vscode-list-hoverBackground)]">
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message content */}
        <div
          className={`max-w-[85%] rounded-lg ${
            isUser ? 'bg-[var(--vscode-button-background)]' : 'bg-[var(--vscode-editor-background)]'
          }`}
          style={{
            border: '1px solid var(--vscode-panel-border)',
          }}
        >
          {isSQL ? (
            <SQLMessage sql={message} />
          ) : (
            <div 
              className="px-4 py-3"
              style={{
                color: isUser 
                  ? 'var(--vscode-button-foreground)' 
                  : 'var(--vscode-editor-foreground)',
                fontSize: 'var(--vscode-font-size, 13px)',
                fontFamily: 'var(--vscode-font-family)',
              }}
            >
              <ReactMarkdown
                components={{
                  code: ({node, inline, className, children, ...props}: CodeProps) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    
                    if (!inline && language) {
                      return (
                        <div className="my-2">
                          <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '0.75rem',
                              background: 'var(--vscode-editor-background)',
                              fontSize: 'var(--vscode-editor-font-size, 13px)',
                              fontFamily: 'var(--vscode-editor-font-family, monospace)',
                              border: '1px solid var(--vscode-panel-border)',
                              borderRadius: '6px',
                            }}
                            showLineNumbers={true}
                            wrapLongLines={true}
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
                          border: '1px solid var(--vscode-panel-border)',
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
        </div>
        
        {/* Timestamp */}
        {timestamp && (
          <div 
            className="text-xs mt-1 px-1"
            style={{
              color: 'var(--vscode-descriptionForeground)',
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