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
    <div className="border-t p-4" style={{ 
      backgroundColor: 'var(--vscode-sideBar-background)',
      borderColor: 'var(--vscode-panel-border)'
    }}>
      <div className="flex space-x-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-h-[80px] p-3 rounded-lg resize-none"
          style={{
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            borderColor: 'var(--vscode-input-border)',
            fontFamily: 'var(--vscode-font-family)',
            outline: 'none',
            border: '1px solid',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="px-6 py-2 rounded-lg h-fit"
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            opacity: (!message.trim() || disabled) ? 0.5 : 1,
            cursor: (!message.trim() || disabled) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--vscode-font-family)',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 