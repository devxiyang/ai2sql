import React from 'react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${isUser ? 'rounded-br-none' : 'rounded-bl-none'}`}
        style={{
          backgroundColor: isUser 
            ? 'var(--vscode-button-background)' 
            : 'var(--vscode-editor-selectionBackground)',
          color: isUser 
            ? 'var(--vscode-button-foreground)' 
            : 'var(--vscode-editor-foreground)',
          fontFamily: 'var(--vscode-font-family)',
        }}
      >
        <p className="text-sm">{message}</p>
        {timestamp && (
          <span 
            className="text-xs mt-1 block"
            style={{
              color: isUser 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-descriptionForeground)',
              opacity: 0.8
            }}
          >
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 