import React from 'react';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  const isSQL = !isUser && (
    message.includes('SELECT') ||
    message.includes('INSERT') ||
    message.includes('UPDATE') ||
    message.includes('DELETE') ||
    message.includes('CREATE') ||
    message.includes('ALTER')
  ) && !message.includes('```');  // Exclude markdown formatted SQL

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
            <SQLMessage sql={message} />
          ) : (
            <div style={{
              color: isUser 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-editor-foreground)',
              fontSize: 'var(--vscode-font-size, 13px)',
              fontFamily: 'var(--vscode-font-family)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {message}
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