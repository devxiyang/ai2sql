import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log('Setting up message event listener');
    
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('Raw message received in App:', message);
      
      // VS Code webview messages come with a specific format
      if (message && message.type === 'response') {
        console.log('Processing response message in App:', message);
        if (message.error) {
          console.log('Error in response:', message.error);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `Error: ${message.error}`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          setIsLoading(false);
          setCurrentResponse('');
        } else if (message.content !== undefined) {  // Changed to check for undefined
          console.log('Content in response:', message.content);
          console.log('Streaming:', message.streaming);
          if (message.streaming) {
            // Update the current response for streaming
            console.log('Updating streaming response:', message.content);
            setCurrentResponse(message.content);
          } else {
            // Add the final message
            console.log('Adding final message:', message.content || currentResponse);
            const finalContent = message.content || currentResponse;
            if (finalContent) {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                content: finalContent,
                isUser: false,
                timestamp: new Date().toLocaleTimeString(),
              }]);
            }
            setIsLoading(false);
            // Don't clear currentResponse until the message is added
            setTimeout(() => setCurrentResponse(''), 100);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('Message event listener registered');

    return () => {
      window.removeEventListener('message', handleMessage);
      console.log('Message event listener removed');
    };
  }, []);

  const handleSendMessage = (content: string) => {
    if (!content.trim() || isLoading) return;

    console.log('Sending message:', content);
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    }]);
    
    // Add a temporary loading message
    setIsLoading(true);
    setCurrentResponse('');

    // Send message to VS Code extension
    try {
      const message = {
        type: content.toLowerCase().includes('optimize') ? 'optimize' : 'generate',
        [content.toLowerCase().includes('optimize') ? 'sql' : 'prompt']: content,
        stream: true  // Enable streaming
      };
      console.log('Posting message to VS Code:', message);
      vscode.postMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setCurrentResponse('');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      }]);
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