import React, { useState, useEffect } from 'react';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  streaming?: boolean;
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

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp, streaming = false }) => {
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
    <div className="px-4 py-2 hover:bg-[var(--vscode-list-hoverBackground)]">
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message content */}
        <div
          className={`max-w-[85%] ${
            isUser ? 'bg-[var(--vscode-button-background)]' : 'bg-[var(--vscode-editor-background)]'
          } ${isSQL ? '' : 'rounded-lg px-4 py-3'}`}
          style={{
            border: isSQL ? 'none' : '1px solid var(--vscode-panel-border)',
          }}
        >
          {isSQL ? (
            <SQLMessage sql={message} streaming={streaming} />
          ) : (
            <div className="relative" style={{
              color: isUser 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-editor-foreground)',
              fontSize: 'var(--vscode-font-size, 13px)',
              fontFamily: 'var(--vscode-font-family)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {isGenerating ? (
                <div className="flex items-center">
                  <span style={{ color: 'var(--vscode-button-background)' }}>AI is thinking</span>
                  <ThinkingAnimation />
                </div>
              ) : (
                <>
                  {message}
                  {!isUser && !isSQL && streaming && (
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