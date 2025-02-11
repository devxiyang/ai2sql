import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import SQLMessage from './SQLMessage';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatContainerProps {
  messages: Message[];
  currentResponse: string;
  isLoading: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, currentResponse, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCurrentResponse = currentResponse.trim().length > 0;

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const behavior = isLoading ? 'auto' : 'smooth';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse, isLoading]);

  console.log('ChatContainer render:', {
    messagesCount: messages.length,
    currentResponse,
    isLoading,
    hasCurrentResponse
  });

  const isSQL = (content: string): boolean => {
    const upperContent = content.toUpperCase();
    return (
      upperContent.includes('SELECT') ||
      upperContent.includes('INSERT') ||
      upperContent.includes('UPDATE') ||
      upperContent.includes('DELETE') ||
      upperContent.includes('CREATE') ||
      upperContent.includes('ALTER')
    ) && !content.includes('```');  // Exclude markdown formatted SQL
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message.content}
          isUser={message.isUser}
          timestamp={message.timestamp}
          streaming={false}
        />
      ))}
      {/* Show loading state or streaming response */}
      {isLoading && !hasCurrentResponse && (
        <ChatMessage
          message="Generating SQL..."
          isUser={false}
          timestamp={new Date().toLocaleTimeString()}
          streaming={false}
        />
      )}
      {hasCurrentResponse && (
        isSQL(currentResponse) ? (
          <SQLMessage
            sql={currentResponse}
            streaming={isLoading}
          />
        ) : (
          <ChatMessage
            message={currentResponse}
            isUser={false}
            timestamp={new Date().toLocaleTimeString()}
            streaming={isLoading}
          />
        )
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer; 