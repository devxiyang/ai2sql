import { VSCodeMessage, GenerateRequest, OptimizeRequest } from '../types/messages';

class VSCodeService {
  private static instance: VSCodeService;
  private messageHandlers: Map<string, (value: any) => void>;

  private constructor() {
    this.messageHandlers = new Map();
    window.addEventListener('message', this.handleMessage);
  }

  public static getInstance(): VSCodeService {
    if (!VSCodeService.instance) {
      VSCodeService.instance = new VSCodeService();
    }
    return VSCodeService.instance;
  }

  private handleMessage = (event: MessageEvent<VSCodeMessage>) => {
    const message = event.data;
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.value);
    }
  };

  public registerMessageHandler(type: string, handler: (value: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  public unregisterMessageHandler(type: string) {
    this.messageHandlers.delete(type);
  }

  public generateSQL(prompt: string): void {
    const message: GenerateRequest = {
      type: 'generate',
      prompt,
    };
    vscode.postMessage(message);
  }

  public optimizeSQL(sql: string): void {
    const message: OptimizeRequest = {
      type: 'optimize',
      sql,
    };
    vscode.postMessage(message);
  }
}

export default VSCodeService; 