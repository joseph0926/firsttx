export type ErrorContext = Record<string, unknown>;

export abstract class BaseFirstTxError extends Error {
  public readonly timestamp: number;
  public readonly context?: ErrorContext;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.timestamp = Date.now();
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  abstract getUserMessage(): string;

  abstract getDebugInfo(): string;

  abstract isRecoverable(): boolean;

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      recoverable: this.isRecoverable(),
    };
  }
}
