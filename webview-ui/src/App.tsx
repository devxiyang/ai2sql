import React, { useState, useEffect, useRef } from 'react';
import ChatContainer from './components/ChatContainer';
import ChatInput from './components/ChatInput';
import SessionList from './components/SessionList';
import { Message } from './types/messages';
import { ChatSession, SessionResponse } from './types/session';

// Acquire VS Code API
const vscode = acquireVsCodeApi();

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
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
      
      if (message.type === 'session_list') {
        const sessionResponse = message as SessionResponse;
        setSessions(sessionResponse.sessions);
        setActiveSessionId(sessionResponse.activeSessionId);
        const activeSession = sessionResponse.sessions.find(s => s.id === sessionResponse.activeSessionId);
        if (activeSession) {
          setMessages(activeSession.messages);
        }
      } else if (message.type === 'response') {
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
            console.log('[Frontend] Received streaming message:', {
              content: message.content,
              currentResponseLength: currentResponse.length
            });
            // For streaming messages, only update currentResponse
            setCurrentResponse(message.content);
          } else {
            console.log('[Frontend] Received final message:', {
              content: message.content,
              currentResponse,
              messagesCount: messages.length
            });
            // When streaming ends or for non-streaming messages
            if (message.content) {
              // Add the message to the messages list
              setMessages(prev => {
                console.log('[Frontend] Updating messages:', {
                  prevCount: prev.length,
                  newContent: message.content
                });
                return [
                  ...prev,
                  {
                    id: messageIdCounter.current.toString(),
                    content: message.content,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString(),
                  }
                ];
              });
              messageIdCounter.current += 1;
            }
            setIsLoading(false);
            setCurrentResponse('');
          }
        } else if (!message.streaming) {
          // If no content and not streaming, just clear states
          setIsLoading(false);
          setCurrentResponse('');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleNewSession = () => {
    vscode.postMessage({ type: 'new_session' });
  };

  const handleSwitchSession = (sessionId: string) => {
    vscode.postMessage({ type: 'switch_session', sessionId });
  };

  const handleDeleteSession = (sessionId: string) => {
    vscode.postMessage({ type: 'delete_session', sessionId });
  };

  const handleRenameSession = (sessionId: string, name: string) => {
    vscode.postMessage({ type: 'rename_session', sessionId, name });
  };

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
    <div className="flex h-full">
      <div className="w-64 border-r border-vscode-panel-border">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewSession={handleNewSession}
          onSwitchSession={handleSwitchSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />
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