/**
 * 简化的Logger类
 */

export class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, metadata?: any): void {
    console.error(`[INFO] ${message}`, metadata ? JSON.stringify(metadata) : '');
  }

  error(message: string, metadata?: any): void {
    console.error(`[ERROR] ${message}`, metadata ? JSON.stringify(metadata) : '');
  }

  warn(message: string, metadata?: any): void {
    console.error(`[WARN] ${message}`, metadata ? JSON.stringify(metadata) : '');
  }

  debug(message: string, metadata?: any): void {
    console.error(`[DEBUG] ${message}`, metadata ? JSON.stringify(metadata) : '');
  }

  child(context: any): Logger {
    return this;
  }
}