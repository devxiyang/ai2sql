export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export type MessageType = 'generate' | 'optimize';

export interface VSCodeMessage {
  type: string;
  value: any;
}

export interface GenerateRequest {
  type: 'generate';
  prompt: string;
}

export interface OptimizeRequest {
  type: 'optimize';
  sql: string;
}

export interface AIResponse {
  type: 'response';
  content: string;
  error?: string;
} 