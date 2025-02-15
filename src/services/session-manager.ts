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
  private readonly MAX_MESSAGES_PER_SESSION = 20; // Limit messages per session
  private readonly context: vscode.ExtensionContext;
  private readonly chatDir: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    // Create .ai2sql/chat directory
    this.chatDir = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), '.ai2sql', 'chat').fsPath;
    this.ensureChatDirExists().then(async () => {
      await this.loadSessions();
      if (this.sessions.length === 0) {
        const session = this.createNewSession();
        this.activeSessionId = session.id;
      } else if (!this.activeSessionId || !this.sessions.find(s => s.id === this.activeSessionId)) {
        this.activeSessionId = this.sessions[0].id;
      }
    }).catch(error => {
      console.error('Error initializing session manager:', error);
    });
  }

  private async ensureChatDirExists(): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.chatDir));
    } catch (error) {
      console.error('Error creating chat directory:', error);
      throw error;
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      // Read all files in the chat directory
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(this.chatDir));
      this.sessions = [];

      for (const [name, type] of entries) {
        if (type === vscode.FileType.File && name.endsWith('.json')) {
          try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(vscode.Uri.joinPath(vscode.Uri.file(this.chatDir), name).fsPath));
            const session = JSON.parse(content.toString()) as ChatSession;
            // Validate UUID
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.id)) {
              session.id = uuidv4();
            }
            this.sessions.push(session);
          } catch (error) {
            console.error(`Error loading session from ${name}:`, error);
          }
        }
      }

      // Set most recent as active
      if (this.sessions.length > 0) {
        const mostRecent = this.sessions.reduce((prev, current) => {
          return new Date(prev.updatedAt) > new Date(current.updatedAt) ? prev : current;
        });
        this.activeSessionId = mostRecent.id;
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      // Save each session to a separate file
      for (const session of this.sessions) {
        const timestamp = new Date(session.createdAt).toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${session.id}.json`;
        const filePath = vscode.Uri.joinPath(vscode.Uri.file(this.chatDir), filename);
        await vscode.workspace.fs.writeFile(
          filePath,
          Buffer.from(JSON.stringify(session, null, 2))
        );
      }
    } catch (error) {
      console.error('Error saving sessions:', error);
      throw error;
    }
  }

  public createNewSession(): ChatSession {
    const sessionNumber = this.sessions.length + 1;
    const newSession: ChatSession = {
      id: uuidv4(),
      name: `Chat ${sessionNumber}`,
      messages: [
        {
          id: uuidv4(),
          content: `I am your AI SQL assistant. How can I help you with SQL queries today?`,
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add new session to the beginning of the array
    this.sessions.unshift(newSession);
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

  public getActiveSessionId(): string {
    return this.activeSessionId;
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

  public async deleteSession(sessionId: string): Promise<void> {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      // Delete local file
      try {
        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(this.chatDir));
        for (const [name, type] of files) {
          if (type === vscode.FileType.File && name.includes(sessionId)) {
            const filePath = vscode.Uri.joinPath(vscode.Uri.file(this.chatDir), name);
            await vscode.workspace.fs.delete(filePath);
          }
        }
      } catch (error) {
        console.error(`Error deleting session file for ${sessionId}:`, error);
      }

      // Update sessions array
      this.sessions.splice(index, 1);
      if (sessionId === this.activeSessionId) {
        // Set the first session (most recent) as active if there are any sessions left
        if (this.sessions.length > 0) {
          this.activeSessionId = this.sessions[0].id;
        } else {
          this.activeSessionId = '';
          // If no sessions left, create a new one
          this.createNewSession();
        }
      }
      await this.saveSessions();
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
    if (!session) {
      console.warn('No active session found, creating new session');
      const newSession = this.createNewSession();
      this.activeSessionId = newSession.id;
      // Add the message after the welcome message
      newSession.messages.push({
        id: uuidv4(),
        content,
        isUser,
        timestamp: new Date().toISOString()
      });
      newSession.updatedAt = new Date().toISOString();
      this.saveSessions();
      return;
    }

    console.log(`Adding message to session ${session.id}`);
    // Add new message
    session.messages.push({
      id: uuidv4(),
      content,
      isUser,
      timestamp: new Date().toISOString()
    });

    // Keep only the most recent messages
    if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      console.log(`Trimming session ${session.id} messages from ${session.messages.length} to ${this.MAX_MESSAGES_PER_SESSION}`);
      session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION);
    }

    session.updatedAt = new Date().toISOString();
    this.saveSessions();
  }
}
