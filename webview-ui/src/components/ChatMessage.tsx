import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  streaming?: boolean;
  onRetry?: () => void;
}

// Add the animation styles to the component
const thinkingAnimationStyle = `
  @keyframes thinking {
    0%, 100% {
      transform: scaleY(0.3);
      opacity: 0.2;
    }
    50% {
      transform: scaleY(1);
      opacity: 1;
    }
  }

  .markdown-body table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    border: 1px solid var(--vscode-panel-border);
  }

  .markdown-body th {
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    padding: 8px;
    border: 1px solid var(--vscode-panel-border);
    font-weight: bold;
  }

  .markdown-body td {
    padding: 8px;
    border: 1px solid var(--vscode-panel-border);
  }

  .markdown-body tr:nth-child(even) {
    background-color: var(--vscode-list-hoverBackground);
  }

  .markdown-body tr:hover {
    background-color: var(--vscode-list-activeSelectionBackground);
  }
`;

// Add the style tag to the document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = thinkingAnimationStyle;
  document.head.appendChild(style);
}

const ThinkingAnimation = () => {
  return (
    <div className="flex items-center gap-2 ml-2">
      <div className="flex items-center gap-1">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            style={{
              width: '3px',
              height: '16px',
              borderRadius: '2px',
              background: 'var(--vscode-button-background)',
              animation: `thinking 1.5s ease-in-out ${index * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp, streaming = false, onRetry }) => {
  const isSQL = !isUser && (
    message.includes('SELECT') ||
    message.includes('INSERT') ||
    message.includes('UPDATE') ||
    message.includes('DELETE') ||
    message.includes('CREATE') ||
    message.includes('ALTER')
  ) && !message.includes('```');  // Exclude markdown formatted SQL

  const isGenerating = message === 'Generating SQL...';

  return (
    <div className="message-wrapper">
      <div className={`message ${isUser ? 'user' : 'assistant'}`}>
        {/* Message content */}
        <div className="message-content"
        >
          {isSQL ? (
            <SQLMessage sql={message} streaming={streaming} />
          ) : (
            <div className="relative markdown-body" style={{
              color: isUser 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-editor-foreground)',
              fontSize: 'var(--vscode-font-size, 13px)',
              fontFamily: 'var(--vscode-font-family)',
            }}>
              {!isUser && message.toLowerCase().includes('error') && onRetry && (
                <div className="error-message">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content">
                    <div>AI生成失败，请重试</div>
                    <button className="retry-button" onClick={onRetry}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      重试
                    </button>
                  </div>
                </div>
              )}
              {isGenerating ? (
                <div className="flex items-center">
                  <span style={{ color: 'var(--vscode-button-background)' }}>AI is thinking</span>
                  <ThinkingAnimation />
                </div>
              ) : (
                <>
                  <ReactMarkdown>
                    {message}
                  </ReactMarkdown>
                  {!isUser && streaming && (
                    <div 
                      className="absolute bottom-0 animate-pulse"
                      style={{
                        width: '2px',
                        height: '1.2em',
                        backgroundColor: 'var(--vscode-button-background)',
                        marginLeft: '2px',
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {timestamp && (
          <div className="message-timestamp">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 