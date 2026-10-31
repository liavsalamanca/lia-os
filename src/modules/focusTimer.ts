/** Vive fuera de React para que el temporizador siga al cambiar de página. */
type State = { mode: number; remaining: number; running: boolean };

class FocusTimer {
  private state: State = { mode: 25, remaining: 25 * 60, running: false };
  private deadline = 0;
  private handle: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<() => void>();
  private finishListeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  onFinish(listener: () => void) {
    this.finishListeners.add(listener);
    return () => void this.finishListeners.delete(listener);
  }

  getState = () => this.state;

  private set(next: State) {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  toggle() {
    clearInterval(this.handle);
    if (this.state.running) {
      this.set({ ...this.state, running: false });
      return;
    }
    this.deadline = Date.now() + this.state.remaining * 1000;
    this.set({ ...this.state, running: true });
    this.handle = setInterval(() => this.tick(), 350);
  }

  private tick() {
    const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
    if (remaining === 0) {
      clearInterval(this.handle);
      this.set({ ...this.state, remaining: 0, running: false });
      this.finishListeners.forEach((l) => l());
    } else if (remaining !== this.state.remaining) {
      this.set({ ...this.state, remaining });
    }
  }

  reset(mode = this.state.mode) {
    clearInterval(this.handle);
    this.set({ mode, remaining: mode * 60, running: false });
  }
}

export const focusTimer = new FocusTimer();
