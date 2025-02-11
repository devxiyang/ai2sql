import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatContainerProps {
  messages: Message[];
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message.content}
          isUser={message.isUser}
          timestamp={message.timestamp}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer; 