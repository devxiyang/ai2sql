import * as vscode from 'vscode';
import { AIServiceFactory } from './services/ai-service-factory';
import { getNonce } from './utils';

interface ChatState {
  id: string;
  messages: Array<{
    content: string;
    isUser: boolean;
  }>;
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private chatStates: Map<string, ChatState> = new Map();

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _aiServiceFactory: AIServiceFactory
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('[AI2SQL] Resolving webview view');
    try {
      this._view = webviewView;

      console.log('[AI2SQL] Setting webview options');
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };
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
          case 'generate':
            try {
              console.log('[AI2SQL] Getting AI service for SQL generation');
              const aiService = await this._aiServiceFactory.getService();
              
              // Get or create chat state
              let chatState = this.chatStates.get(data.chatId);
              if (!chatState) {
                chatState = {
                  id: data.chatId,
                  messages: []
                };
                this.chatStates.set(data.chatId, chatState);
              }

              // Update chat state with new message
              chatState.messages = [...data.history];

              // Generate SQL with streaming
              if (data.stream) {
                console.log('[AI2SQL] Starting streaming SQL generation');
                await aiService.generateSQL(
                  data.prompt,
                  (chunk) => {
                    if (this._view) {
                      this._view.webview.postMessage({
                        type: 'response',
                        content: chunk,
                        streaming: true
                      });
                    }
                  },
                  chatState.messages
                );
                
                // Send final message to indicate stream end
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    streaming: false
                  });
                }
                console.log('[AI2SQL] Streaming SQL generation completed');
              } else {
                console.log('[AI2SQL] Starting non-streaming SQL generation');
                const sql = await aiService.generateSQL(data.prompt, undefined, chatState.messages);
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    content: sql,
                    streaming: false
                  });
                }
                console.log('[AI2SQL] Non-streaming SQL generation completed');
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
              
              // Get or create chat state
              let chatState = this.chatStates.get(data.chatId);
              if (!chatState) {
                chatState = {
                  id: data.chatId,
                  messages: []
                };
                this.chatStates.set(data.chatId, chatState);
              }

              // Update chat state with new message
              chatState.messages = [...data.history];

              // Optimize SQL with streaming
              if (data.stream) {
                console.log('[AI2SQL] Starting streaming SQL optimization');
                await aiService.optimizeSQL(
                  data.sql,
                  (chunk) => {
                    if (this._view) {
                      this._view.webview.postMessage({
                        type: 'response',
                        content: chunk,
                        streaming: true
                      });
                    }
                  }
                );
                
                // Send final message to indicate stream end
                if (this._view) {
                  this._view.webview.postMessage({
                    type: 'response',
                    streaming: false
                  });
                }
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
            html, body, #root {
              height: 100%;
              margin: 0;
              padding: 0;
              background-color: var(--vscode-editor-background);
              color: var(--vscode-editor-foreground);
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
            }
            #root {
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