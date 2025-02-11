import { VSCodeMessage, GenerateRequest, OptimizeRequest } from '../types/messages';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
    };
  }
}

class VSCodeService {
  private static instance: VSCodeService;
  private messageHandlers: Map<string, (value: any) => void>;
  private vscode: { postMessage: (message: any) => void };

  private constructor() {
    this.messageHandlers = new Map();
    this.vscode = window.acquireVsCodeApi();
    console.log('VSCode API acquired');
    
    window.addEventListener('message', this.handleMessage);
    console.log('Message listener added');
  }

  public static getInstance(): VSCodeService {
    if (!VSCodeService.instance) {
      VSCodeService.instance = new VSCodeService();
      console.log('VSCode service instance created');
    }
    return VSCodeService.instance;
  }

  private handleMessage = (event: MessageEvent<VSCodeMessage>) => {
    console.log('Message received:', event.data);
    const message = event.data;
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      console.log('Handler found for message type:', message.type);
      handler(message.value);
    } else {
      console.log('No handler found for message type:', message.type);
    }
  };

  public registerMessageHandler(type: string, handler: (value: any) => void) {
    console.log('Registering handler for type:', type);
    this.messageHandlers.set(type, handler);
  }

  public unregisterMessageHandler(type: string) {
    console.log('Unregistering handler for type:', type);
    this.messageHandlers.delete(type);
  }

  public generateSQL(prompt: string): void {
    console.log('Generating SQL for prompt:', prompt);
    const message: GenerateRequest = {
      type: 'generate',
      prompt,
    };
    this.vscode.postMessage(message);
    console.log('Generate message sent');
  }

  public optimizeSQL(sql: string): void {
    console.log('Optimizing SQL:', sql);
    const message: OptimizeRequest = {
      type: 'optimize',
      sql,
    };
    this.vscode.postMessage(message);
    console.log('Optimize message sent');
  }
}

export default VSCodeService; 