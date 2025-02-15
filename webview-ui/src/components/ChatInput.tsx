import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onInterrupt?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isGenerating?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  onInterrupt,
  placeholder = 'Type your message...', 
  disabled = false,
  isGenerating = false
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="input-box"
        style={{
          opacity: disabled ? 0.5 : 1
        }}
      />
      <button
        onClick={isGenerating ? onInterrupt : handleSend}
        disabled={(!message.trim() && !isGenerating) || (disabled && !isGenerating)}
        className="rounded-md transition-all flex items-center justify-center"
        style={{
          backgroundColor: isGenerating ? 'var(--vscode-errorForeground)' : 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          opacity: (!message.trim() && !isGenerating) || (disabled && !isGenerating) ? 0.5 : 1,
          cursor: isGenerating ? 'pointer' : (!message.trim() || disabled) ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--vscode-font-family)',
          fontSize: 'var(--vscode-font-size, 13px)',
          width: isGenerating ? '32px' : '60px',
          height: '32px',
          padding: isGenerating ? '0' : '0 12px',
          border: 'none'
        }}
      >
        {isGenerating ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        ) : (
          'Send'
        )}
      </button>
    </div>
  );
};

export default ChatInput; 