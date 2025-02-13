import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  placeholder = 'Type your message...', 
  disabled = false 
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
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="px-3 rounded-md transition-opacity"
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            opacity: (!message.trim() || disabled) ? 0.5 : 1,
            cursor: (!message.trim() || disabled) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--vscode-font-family)',
            fontSize: 'var(--vscode-font-size, 13px)',
            border: 'none',
            height: '32px',
          }}
        >
          Send
        </button>
      </div>
  );
};

export default ChatInput; 