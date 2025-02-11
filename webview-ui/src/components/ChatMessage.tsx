import React, { useState, useEffect } from 'react';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  streaming?: boolean;
}

const ThinkingAnimation = () => {
  const dotCount = 3;
  const [dots, setDots] = useState<number[]>([]);

  useEffect(() => {
    let currentDot = 0;
    const interval = setInterval(() => {
      setDots(prev => {
        const newDots = [...prev, currentDot];
        if (newDots.length > dotCount) {
          newDots.shift();
        }
        return newDots;
      });
      currentDot = (currentDot + 1) % dotCount;
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1 ml-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            dots.includes(index)
              ? 'bg-[var(--vscode-textLink-foreground)] scale-100 opacity-100'
              : 'bg-[var(--vscode-descriptionForeground)] scale-75 opacity-50'
          }`}
          style={{
            transform: dots.includes(index) ? 'translateY(-2px)' : 'translateY(0)',
          }}
        />
      ))}
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
                  <span>AI is thinking</span>
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
                        backgroundColor: 'var(--vscode-textLink-foreground)',
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