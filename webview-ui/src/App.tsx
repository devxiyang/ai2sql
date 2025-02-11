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
    console.log('VSCode service initialized');

    const handleResponse = (response: AIResponse) => {
      console.log('Received response:', response);
      setIsLoading(false);
      if (response.error) {
        console.error('Response error:', response.error);
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
    console.log('Response handler registered');

    return () => {
      vscodeService.unregisterMessageHandler('response');
      console.log('Response handler unregistered');
    };
  }, []);

  const handleSendMessage = (content: string) => {
    console.log('Sending message:', content);
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    const vscodeService = VSCodeService.getInstance();
    if (content.toLowerCase().includes('optimize')) {
      console.log('Sending optimize request');
      vscodeService.optimizeSQL(content);
    } else {
      console.log('Sending generate request');
      vscodeService.generateSQL(content);
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--vscode-editor-background)' }}>
      <div className="flex-none border-b" style={{ 
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderColor: 'var(--vscode-panel-border)',
      }}>
        <h1 className="text-xl p-4" style={{ 
          color: 'var(--vscode-foreground)',
          fontFamily: 'var(--vscode-font-family)'
        }}>
          AI2SQL
        </h1>
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