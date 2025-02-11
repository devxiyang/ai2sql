import * as vscode from 'vscode';
import { AIService } from './services/ai-service';
import { getNonce } from './utils';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    private _aiService?: AIService;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    private getService(): AIService {
        if (!this._aiService) {
            this._aiService = new AIService();
        }
        return this._aiService;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message: any) => {
            try {
                const aiService = this.getService();
                
                switch (message.type) {
                    case 'generate':
                        try {
                            if (message.stream) {
                                await aiService.generateSQL(message.prompt, (chunk) => {
                                    webviewView.webview.postMessage({
                                        type: 'response',
                                        content: chunk,
                                        streaming: true
                                    });
                                }, message.history);
                                // Send final message to indicate completion
                                webviewView.webview.postMessage({
                                    type: 'response',
                                    content: '',
                                    streaming: false
                                });
                            } else {
                                const sql = await aiService.generateSQL(message.prompt, undefined, message.history);
                                webviewView.webview.postMessage({
                                    type: 'response',
                                    content: sql
                                });
                            }
                        } catch (error) {
                            console.error('Error in generate:', error);
                            webviewView.webview.postMessage({
                                type: 'response',
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        break;
                    case 'optimize':
                        try {
                            if (message.stream) {
                                await aiService.optimizeSQL(message.sql, (chunk) => {
                                    webviewView.webview.postMessage({
                                        type: 'response',
                                        content: chunk,
                                        streaming: true
                                    });
                                });
                                // Send final message to indicate completion
                                webviewView.webview.postMessage({
                                    type: 'response',
                                    content: '',
                                    streaming: false
                                });
                            } else {
                                const optimizedSql = await aiService.optimizeSQL(message.sql);
                                webviewView.webview.postMessage({
                                    type: 'response',
                                    content: optimizedSql
                                });
                            }
                        } catch (error) {
                            console.error('Error in optimize:', error);
                            webviewView.webview.postMessage({
                                type: 'response',
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        break;
                }
            } catch (error) {
                console.error('Service error:', error);
                webviewView.webview.postMessage({
                    type: 'response',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'bundle.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:;">
                <title>AI2SQL</title>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
} 