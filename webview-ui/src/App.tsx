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
    
    // Request session list on mount
    vscode.postMessage({ type: 'get_sessions' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'session_list') {
        const sessionResponse = message as SessionResponse;
        setSessions(sessionResponse.sessions);
        const newActiveId = sessionResponse.activeSessionId;
        const oldActiveId = activeSessionId;
        setActiveSessionId(newActiveId);

        // Get the active session
        const activeSession = sessionResponse.sessions.find(s => s.id === newActiveId);

        // Update messages in these cases:
        // 1. No messages in the current view
        // 2. Switching to a different session
        // 3. We have messages but they're from a different session
        const shouldUpdateMessages = 
          messages.length === 0 || 
          newActiveId !== oldActiveId || 
          (activeSession && messages.length !== activeSession.messages.length);

        if (activeSession && shouldUpdateMessages) {
          setMessages(activeSession.messages);
          setCurrentResponse(''); // Clear any partial response when switching sessions
        } else if (!activeSession) {
          // If no active session found, clear messages
          setMessages([]);
          setCurrentResponse('');
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

  // Load sessions on mount
  useEffect(() => {
    vscode.postMessage({ type: 'get_sessions' });
  }, []);

  const generateSessionName = (messages: Message[]) => {
    // Find first user message
    const firstUserMessage = messages.find(m => m.isUser);
    if (firstUserMessage) {
      // Take first 30 characters of the message
      const name = firstUserMessage.content.slice(0, 30);
      return name + (firstUserMessage.content.length > 30 ? '...' : '');
    }
    return 'New Chat';
  };

  const handleNewSession = () => {
    // Interrupt current AI request if any
    if (isLoading) {
      vscode.postMessage({ type: 'interrupt' });
      setIsLoading(false);
      setCurrentResponse('');
    }

    // Clear messages and current response immediately
    setMessages([]);
    setCurrentResponse('');

    vscode.postMessage({ 
      type: 'new_session',
      name: 'New Chat' // Initial name, will be updated after first message
    });
  };

  const handleSwitchSession = (sessionId: string) => {
    // Interrupt current AI request if any
    if (isLoading) {
      vscode.postMessage({ type: 'interrupt' });
      setIsLoading(false);
      setCurrentResponse('');
    }

    vscode.postMessage({ type: 'switch_session', sessionId });
  };

  const handleDeleteSession = (sessionId: string) => {
    vscode.postMessage({ type: 'delete_session', sessionId });
    if (sessions.length === 1) {
      setMessages([]);
      setCurrentResponse('');
    }
  };

  const handleRenameSession = (sessionId: string, name: string) => {
    vscode.postMessage({ type: 'rename_session', sessionId, name });
  };

  const handleRetry = () => {
    // Get the last user message
    const lastUserMessage = messages.filter(m => m.isUser).pop();
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Add user message to chat
    const newMessage = {
      id: messageIdCounter.current.toString(),
      content: content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    messageIdCounter.current += 1;

    // Clear current response first
    setCurrentResponse('');
    setIsLoading(true);

    // Send message to VS Code extension first
    try {
      // Update messages state first
      setMessages(prev => [...prev, newMessage]);

      // If this is the first user message, update session name
      if (!messages.some(m => m.isUser)) {
        vscode.postMessage({
          type: 'rename_session',
          sessionId: activeSessionId,
          name: generateSessionName([newMessage])
        });
      }

      // Then send the message to backend
      const message = {
        type: content.toLowerCase().includes('optimize') ? 'optimize' : 'generate',
        [content.toLowerCase().includes('optimize') ? 'sql' : 'prompt']: content,
        stream: true,
        history: [...messages, newMessage].map(msg => ({
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
    <div className="app-container">
      <div className="app-sidebar">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewSession={handleNewSession}
          onSwitchSession={handleSwitchSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />
      </div>
      <div className="main-content">
        <div className="chat-container">
          <ChatContainer 
            messages={messages} 
            currentResponse={currentResponse}
            isLoading={isLoading}
            onRetry={handleRetry}
          />
        </div>
        <div className="input-container">
          <ChatInput 
            onSend={handleSendMessage} 
            onInterrupt={() => {
              vscode.postMessage({ type: 'interrupt' });
              setIsLoading(false);
              setCurrentResponse('');
            }}
            placeholder="Ask me to generate or optimize SQL..." 
            disabled={isLoading}
            isGenerating={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default App;