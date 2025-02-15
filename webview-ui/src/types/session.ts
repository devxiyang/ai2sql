export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface NewSessionRequest {
  type: 'new_session';
}

export interface SwitchSessionRequest {
  type: 'switch_session';
  sessionId: string;
}

export interface DeleteSessionRequest {
  type: 'delete_session';
  sessionId: string;
}

export interface RenameSessionRequest {
  type: 'rename_session';
  sessionId: string;
  name: string;
}

export interface SessionResponse {
  type: 'session_list';
  sessions: ChatSession[];
  activeSessionId: string;
}
