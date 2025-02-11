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
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm">{message}</p>
        {timestamp && (
          <span className={`text-xs mt-1 block ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 