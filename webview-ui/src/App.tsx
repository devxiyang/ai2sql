import React, { useState, useEffect, useRef } from 'react';
import ChatContainer from './components/ChatContainer';
import ChatInput from './components/ChatInput';
import { Message, AIResponse } from './types/messages';

// Acquire VS Code API
const vscode = acquireVsCodeApi();

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
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const messageIdCounter = useRef(2);

  useEffect(() => {
    console.log('Setting up message event listener');
    
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message && message.type === 'response') {
        if (message.error) {
          console.error('Error in response:', message.error);
          setMessages(prev => [...prev, {
            id: messageIdCounter.current.toString(),
            content: `Error: ${message.error}`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          messageIdCounter.current += 1;
          setIsLoading(false);
          setCurrentResponse('');
        } else if (message.content !== undefined) {
          if (message.streaming) {
            setCurrentResponse(message.content);
          } else {
            const finalContent = message.content || currentResponse;
            
            if (finalContent) {
              setMessages(prev => [...prev, {
                id: messageIdCounter.current.toString(),
                content: finalContent,
                isUser: false,
                timestamp: new Date().toLocaleTimeString(),
              }]);
              messageIdCounter.current += 1;
              
              // Clear loading state and current response
              setIsLoading(false);
              setCurrentResponse('');
            } else {
              setIsLoading(false);
              setCurrentResponse('');
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [currentResponse]);

  const handleSendMessage = (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: messageIdCounter.current.toString(),
      content: content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    }]);
    messageIdCounter.current += 1;
    
    // Reset state for new response
    setIsLoading(true);
    setCurrentResponse('');

    // Send message to VS Code extension
    try {
      const message = {
        type: content.toLowerCase().includes('optimize') ? 'optimize' : 'generate',
        [content.toLowerCase().includes('optimize') ? 'sql' : 'prompt']: content,
        stream: true,
        history: messages.map(msg => ({
          content: msg.content,
          isUser: msg.isUser
        }))
      };
      vscode.postMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setCurrentResponse('');
      setMessages(prev => [...prev, {
        id: messageIdCounter.current.toString(),
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      }]);
      messageIdCounter.current += 1;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none border-b" style={{ 
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderColor: 'var(--vscode-panel-border)',
      }}>
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{
          backgroundColor: 'var(--vscode-editor-background)',
        }}>
          <ChatContainer 
            messages={messages} 
            currentResponse={currentResponse}
            isLoading={isLoading}
          />
        </div>
        <div className="flex-none" style={{
          borderTop: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
        }}>
          <ChatInput 
            onSend={handleSendMessage} 
            placeholder="Ask me to generate or optimize SQL..." 
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default App; 