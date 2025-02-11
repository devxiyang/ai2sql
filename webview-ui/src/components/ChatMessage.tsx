import React from 'react';
import ReactMarkdown from 'react-markdown';
import SQLMessage from './SQLMessage';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
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
        {isSQL ? (
          <SQLMessage sql={message} />
        ) : (
          <div className="text-sm markdown-body">
            <ReactMarkdown>{message}</ReactMarkdown>
          </div>
        )}
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