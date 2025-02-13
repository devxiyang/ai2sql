import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export class SessionManager {
  private sessions: ChatSession[] = [];
  private activeSessionId: string = '';
  private readonly storageKey = 'ai2sql.sessions';
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadSessions();
    if (this.sessions.length === 0) {
      this.createNewSession();
    }
  }

  private loadSessions(): void {
    const sessionsData = this.context.globalState.get<ChatSession[]>(this.storageKey);
    if (sessionsData) {
      this.sessions = sessionsData;
      // Set the most recently updated session as active
      const mostRecent = this.sessions.reduce((prev, current) => {
        return new Date(prev.updatedAt) > new Date(current.updatedAt) ? prev : current;
      });
      this.activeSessionId = mostRecent.id;
    }
  }

  private async saveSessions(): Promise<void> {
    await this.context.globalState.update(this.storageKey, this.sessions);
  }

  public createNewSession(): ChatSession {
    const newSession: ChatSession = {
      id: uuidv4(),
      name: `Chat ${this.sessions.length + 1}`,
      messages: [
        {
          id: uuidv4(),
          content: 'Welcome to AI2SQL! How can I help you today?',
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sessions.push(newSession);
    this.activeSessionId = newSession.id;
    this.saveSessions();
    return newSession;
  }

  public getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.find(s => s.id === sessionId);
  }

  public getActiveSession(): ChatSession | undefined {
    return this.getSession(this.activeSessionId);
  }

  public getAllSessions(): ChatSession[] {
    return this.sessions;
  }

  public setActiveSession(sessionId: string): ChatSession | undefined {
    const session = this.getSession(sessionId);
    if (session) {
      this.activeSessionId = sessionId;
      this.saveSessions();
    }
    return session;
  }

  public deleteSession(sessionId: string): void {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
      if (sessionId === this.activeSessionId) {
        // Set the most recent session as active
        if (this.sessions.length > 0) {
          this.activeSessionId = this.sessions[this.sessions.length - 1].id;
        } else {
          // Create a new session if we deleted the last one
          const newSession = this.createNewSession();
          this.activeSessionId = newSession.id;
        }
      }
      this.saveSessions();
    }
  }

  public renameSession(sessionId: string, name: string): ChatSession | undefined {
    const session = this.getSession(sessionId);
    if (session) {
      session.name = name;
      session.updatedAt = new Date().toISOString();
      this.saveSessions();
    }
    return session;
  }

  public addMessageToActiveSession(content: string, isUser: boolean): void {
    const session = this.getActiveSession();
    if (session) {
      session.messages.push({
        id: uuidv4(),
        content,
        isUser,
        timestamp: new Date().toISOString()
      });
      session.updatedAt = new Date().toISOString();
      this.saveSessions();
    }
  }

  public getActiveSessionId(): string {
    return this.activeSessionId;
  }
}
