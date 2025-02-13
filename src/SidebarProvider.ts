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
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'generate':
          try {
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
            } else {
              const sql = await aiService.generateSQL(data.prompt, undefined, chatState.messages);
              if (this._view) {
                this._view.webview.postMessage({
                  type: 'response',
                  content: sql,
                  streaming: false
                });
              }
            }
          } catch (error) {
            console.error('Error generating SQL:', error);
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
            } else {
              const optimizedSql = await aiService.optimizeSQL(data.sql);
              if (this._view) {
                this._view.webview.postMessage({
                  type: 'response',
                  content: optimizedSql,
                  streaming: false
                });
              }
            }
          } catch (error) {
            console.error('Error optimizing SQL:', error);
            if (this._view) {
              this._view.webview.postMessage({
                type: 'response',
                error: error instanceof Error ? error.message : 'Failed to optimize SQL'
              });
            }
          }
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview-ui', 'bundle.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
          <title>AI2SQL</title>
        </head>
        <body>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>`;
  }
} 