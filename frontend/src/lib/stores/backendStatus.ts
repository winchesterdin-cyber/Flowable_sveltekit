/**
 * Backend status store for tracking backend startup state
 * Used to show UI feedback when the backend is starting up (cold start on Railway)
 */

export type BackendState = 'ready' | 'starting' | 'error';

interface BackendStatusState {
  state: BackendState;
  currentAttempt: number;
  maxAttempts: number;
  errorMessage: string | null;
}

class BackendStatusStore {
  private _state: BackendState = 'ready';
  private _currentAttempt: number = 0;
  private _maxAttempts: number = 0;
  private _errorMessage: string | null = null;
  private listeners: Set<(state: BackendStatusState) => void> = new Set();

  get state(): BackendState {
    return this._state;
  }

  get currentAttempt(): number {
    return this._currentAttempt;
  }

  get maxAttempts(): number {
    return this._maxAttempts;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }

  get isStarting(): boolean {
    return this._state === 'starting';
  }

  get isReady(): boolean {
    return this._state === 'ready';
  }

  get isError(): boolean {
    return this._state === 'error';
  }

  private notify() {
    const state: BackendStatusState = {
      state: this._state,
      currentAttempt: this._currentAttempt,
      maxAttempts: this._maxAttempts,
      errorMessage: this._errorMessage
    };
    this.listeners.forEach((listener) => listener(state));
  }

  setStarting(attempt: number, maxAttempts: number) {
    this._state = 'starting';
    this._currentAttempt = attempt;
    this._maxAttempts = maxAttempts;
    this._errorMessage = null;
    this.notify();
  }

  setReady() {
    this._state = 'ready';
    this._currentAttempt = 0;
    this._maxAttempts = 0;
    this._errorMessage = null;
    this.notify();
  }

  setError(message: string) {
    this._state = 'error';
    this._errorMessage = message;
    this.notify();
  }

  subscribe(listener: (state: BackendStatusState) => void): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener({
      state: this._state,
      currentAttempt: this._currentAttempt,
      maxAttempts: this._maxAttempts,
      errorMessage: this._errorMessage
    });
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const backendStatus = new BackendStatusStore();
