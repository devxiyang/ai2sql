import React, { useState, useEffect } from 'react';
import ChatContainer from './components/ChatContainer';
import ChatInput from './components/ChatInput';
import VSCodeService from './services/vscode';
import { Message, AIResponse } from './types/messages';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to AI2SQL! How can I help you today?',
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const vscodeService = VSCodeService.getInstance();

    const handleResponse = (response: AIResponse) => {
      setIsLoading(false);
      if (response.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            content: `Error: ${response.error}`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            content: response.content,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    vscodeService.registerMessageHandler('response', handleResponse);

    return () => {
      vscodeService.unregisterMessageHandler('response');
    };
  }, []);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    // Send message to VS Code extension
    const vscodeService = VSCodeService.getInstance();
    if (content.toLowerCase().includes('optimize')) {
      vscodeService.optimizeSQL(content);
    } else {
      vscodeService.generateSQL(content);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-none bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-800">AI2SQL</h1>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <ChatContainer messages={messages} />
        <ChatInput 
          onSend={handleSendMessage} 
          placeholder="Ask me to generate or optimize SQL..." 
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default App; 