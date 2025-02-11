import * as vscode from 'vscode';
import { AIService } from './services/ai-service';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    private _aiService: AIService;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._aiService = new AIService(AIService.getConfiguration());
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'generateSQL':
                    try {
                        const sql = await this._aiService.generateSQL(data.text);
                        webviewView.webview.postMessage({
                            command: 'addResponse',
                            sql: sql
                        });
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error generating SQL: ${error}`);
                    }
                    break;
                case 'copyToEditor':
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            editBuilder.insert(editor.selection.active, data.sql);
                        });
                    }
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI2SQL Chat</title>
            <style>
                body {
                    padding: 0;
                    margin: 0;
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                }
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    padding: 1rem;
                }
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    margin-bottom: 1rem;
                    padding: 1rem;
                }
                .message {
                    margin-bottom: 1rem;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                }
                .user-message {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                }
                .assistant-message {
                    background-color: var(--vscode-editor-selectionBackground);
                    color: var(--vscode-editor-foreground);
                }
                .input-container {
                    display: flex;
                    gap: 0.5rem;
                }
                textarea {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    resize: none;
                    font-family: var(--vscode-font-family);
                }
                button {
                    padding: 0.5rem 1rem;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                pre {
                    background-color: var(--vscode-editor-background);
                    padding: 1rem;
                    overflow-x: auto;
                    border-radius: 4px;
                    font-family: var(--vscode-editor-font-family);
                }
                code {
                    font-family: var(--vscode-editor-font-family);
                }
            </style>
        </head>
        <body>
            <div class="chat-container">
                <div class="messages" id="messages"></div>
                <div class="input-container">
                    <textarea id="userInput" rows="3" placeholder="Describe your SQL query requirements..."></textarea>
                    <button id="sendButton">Send</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const messagesContainer = document.getElementById('messages');
                const userInput = document.getElementById('userInput');
                const sendButton = document.getElementById('sendButton');

                function addMessage(content, isUser) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
                    
                    if (!isUser && content.includes('SELECT')) {
                        // If it's an AI response with SQL, format it with a copy button
                        messageDiv.innerHTML = \`
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <pre><code>\${content}</code></pre>
                                <button onclick="copyToEditor('\${content.replace(/'/g, "\\'")}')">Copy to Editor</button>
                            </div>
                        \`;
                    } else {
                        messageDiv.textContent = content;
                    }
                    
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }

                function copyToEditor(sql) {
                    vscode.postMessage({
                        command: 'copyToEditor',
                        sql: sql
                    });
                }

                userInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });

                sendButton.addEventListener('click', () => {
                    sendMessage();
                });

                function sendMessage() {
                    const message = userInput.value.trim();
                    if (message) {
                        addMessage(message, true);
                        vscode.postMessage({
                            command: 'generateSQL',
                            text: message
                        });
                        userInput.value = '';
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'addResponse':
                            addMessage(message.sql, false);
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }
} 