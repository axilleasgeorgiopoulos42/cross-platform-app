export interface SubmitGuard {
  run(fn: () => void | Promise<void>): Promise<boolean>;
  isRunning(): boolean;
}

export function createSubmitGuard(): SubmitGuard {
  let running = false;
  return {
    isRunning: () => running,
    async run(fn) {
      if (running) return false;
      running = true;
      try {
        await fn();
        return true;
      } finally {
        running = false;
      }
    },
  };
}
