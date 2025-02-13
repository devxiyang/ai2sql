import * as vscode from 'vscode';
import { AIServiceFactory } from './services/ai-service-factory';
import { getNonce } from './utils';

import { SessionManager } from './services/session-manager';

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private sessionManager: SessionManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _aiServiceFactory: AIServiceFactory,
    context: vscode.ExtensionContext
  ) {
    this.sessionManager = new SessionManager(context);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('[AI2SQL] Resolving webview view');
    try {
      this._view = webviewView;
      
      // Set webview options
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };
      
      // Set description
      webviewView.description = "AI SQL Assistant";
      
      console.log('[AI2SQL] Setting webview options');
      console.log('[AI2SQL] Webview options set successfully');

      console.log('[AI2SQL] Getting HTML for webview');
      const html = this._getHtmlForWebview(webviewView.webview);
      console.log('[AI2SQL] HTML generated successfully');
      webviewView.webview.html = html;
      console.log('[AI2SQL] HTML set to webview');

      console.log('[AI2SQL] Setting up message handler');
      webviewView.webview.onDidReceiveMessage(async (data) => {
        console.log('[AI2SQL] Received message:', data);
      try {
        switch (data.type) {
          case 'clear_sessions':
            await this.sessionManager.clearAllSessions();
            this.notifySessionUpdate();
            if (this._view) {
              this._view.webview.postMessage({
                type: 'response',
                content: 'All sessions cleared. Starting fresh!',
                isUser: false
              });
            }
            break;

          case 'new_session':
            const newSession = this.sessionManager.createNewSession();
            this.notifySessionUpdate();
            break;

          case 'switch_session':
            this.sessionManager.setActiveSession(data.sessionId);
            this.notifySessionUpdate();
            break;

          case 'delete_session':
            this.sessionManager.deleteSession(data.sessionId);
            this.notifySessionUpdate();
            break;

          case 'rename_session':
            this.sessionManager.renameSession(data.sessionId, data.name);
            this.notifySessionUpdate();
            break;

          case 'generate':
            try {
              console.log('[AI2SQL] Getting AI service for SQL generation');
              const aiService = await this._aiServiceFactory.getService();
              
              // Add user message to session and get active session
              this.sessionManager.addMessageToActiveSession(data.prompt, true);
              
              // Get session messages
              const activeSession = this.sessionManager.getActiveSession();
              if (!activeSession) {
                throw new Error('Failed to get active session');
              }
              
              console.log(`Processing request for session: ${activeSession.id}`);

              // Generate SQL with streaming
              if (data.stream) {
                console.log('[AI2SQL] Starting streaming SQL generation');
                let finalContent = '';
                console.log('[Backend] Starting SQL generation for prompt:', data.prompt);
                await aiService.generateSQL(
                  data.prompt,
                  (chunk) => {
                    console.log('[Backend] Received chunk:', chunk);
                    finalContent += chunk;
                    console.log('[Backend] Current finalContent:', finalContent);
                    if (this._view) {
                      console.log('[Backend] Sending streaming message');
                      this._view.webview.postMessage({
                        type: 'response',
                        content: finalContent,
                        streaming: true
                      });
                    }
                  },
                  activeSession.messages.map(m => ({ content: m.content, isUser: m.isUser }))
                );
                
                // Send final message to indicate stream end
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    content: finalContent,
                    streaming: false
                  });
                }
                
                // Add AI response to session
                this.sessionManager.addMessageToActiveSession(finalContent, false);
                console.log('[AI2SQL] Streaming SQL generation completed');
              } else {
                console.log('[AI2SQL] Starting non-streaming SQL generation');
                const sql = await aiService.generateSQL(
                  data.prompt,
                  undefined,
                  activeSession.messages.map(m => ({ content: m.content, isUser: m.isUser }))
                );
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    content: sql,
                    streaming: false
                  });
                }
                console.log('[AI2SQL] Non-streaming SQL generation completed');
                // Add AI response to session
                this.sessionManager.addMessageToActiveSession(sql, false);
              }
            } catch (error) {
              console.error('[AI2SQL] Error generating SQL:', error);
              if (this._view) {
                this._view.webview.postMessage({
                  type: 'response',
                  error: error instanceof Error ? error.message : 'Failed to generate SQL'
                });
              }
            }
            break;

          case 'optimize':
            try {
              console.log('[AI2SQL] Getting AI service for SQL optimization');
              const aiService = await this._aiServiceFactory.getService();
              
              // Add user message to session
              this.sessionManager.addMessageToActiveSession(data.sql, true);

              // Get session messages
              const session = this.sessionManager.getActiveSession();
              if (!session) {
                throw new Error('No active session');
              }

              // Optimize SQL with streaming
              if (data.stream) {
                console.log('[AI2SQL] Starting streaming SQL optimization');
                let finalContent = '';
                await aiService.optimizeSQL(
                  data.sql,
                  (chunk) => {
                    finalContent += chunk;
                    if (this._view) {
                      this._view.webview.postMessage({
                        type: 'response',
                        content: finalContent,
                        streaming: true
                      });
                    }
                  }
                );
                
                // Send final message to indicate stream end
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    content: finalContent,
                    streaming: false
                  });
                }
                
                // Add AI response to session
                this.sessionManager.addMessageToActiveSession(finalContent, false);
                console.log('[AI2SQL] Streaming SQL optimization completed');
              } else {
                console.log('[AI2SQL] Starting non-streaming SQL optimization');
                const optimizedSql = await aiService.optimizeSQL(data.sql);
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    content: optimizedSql,
                    streaming: false
                  });
                }
                console.log('[AI2SQL] Non-streaming SQL optimization completed');
                // Add AI response to session
                this.sessionManager.addMessageToActiveSession(optimizedSql, false);
              }
            } catch (error) {
              console.error('[AI2SQL] Error optimizing SQL:', error);
              if (this._view) {
                this._view.webview.postMessage({
                  type: 'response',
                  error: error instanceof Error ? error.message : 'Failed to optimize SQL'
                });
              }
            }
            break;

          default:
            console.warn('[AI2SQL] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('[AI2SQL] Error handling message:', error);
        if (this._view) {
          this._view.webview.postMessage({
            type: 'response',
            error: error instanceof Error ? error.message : 'Failed to process request'
          });
        }
      }
    });
    } catch (error) {
      console.error('[AI2SQL] Error in resolveWebviewView:', error);
      vscode.window.showErrorMessage(`Failed to initialize AI2SQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private notifySessionUpdate(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'session_list',
        sessions: this.sessionManager.getAllSessions(),
        activeSessionId: this.sessionManager.getActiveSessionId()
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    console.log('[AI2SQL] Getting webview URIs');
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'bundle.js')
    );
    console.log('[AI2SQL] Script URI:', scriptUri.toString());

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src 'self';">
          <title>AI2SQL</title>
          <style>
            * {
              box-sizing: border-box;
            }
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
              background-color: var(--vscode-editor-background);
              color: var(--vscode-editor-foreground);
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
            }
            #root {
              height: 100%;
              display: flex;
              flex-direction: column;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
          <script nonce="${nonce}">
            window.addEventListener('error', function(event) {
              console.error('[AI2SQL] Runtime error:', event.error);
            });
            window.addEventListener('unhandledrejection', function(event) {
              console.error('[AI2SQL] Unhandled promise rejection:', event.reason);
            });
          </script>
        </body>
      </html>`;
  }
} 