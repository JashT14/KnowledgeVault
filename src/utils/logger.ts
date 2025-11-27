// Check if we're in development mode
const isDev = __DEV__;

/**
 * Log debug messages only in development mode
 * @param message - Message to log
 * @param data - Optional data to include
 */
export function logDebug(message: string, data?: unknown): void {
  if (isDev) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Log and measure time taken for embedding generation
 * @param label - Label for the operation
 * @param startTime - Start time from performance.now() or Date.now()
 */
export function logEmbeddingTime(label: string, startTime: number): void {
  if (isDev) {
    const elapsed = Date.now() - startTime;
    console.log(`[EMBEDDING] ${label}: ${elapsed}ms`);
  }
}

/**
 * Log and measure time taken for retrieval operations
 * @param label - Label for the operation
 * @param startTime - Start time from performance.now() or Date.now()
 * @param resultCount - Number of results retrieved
 */
export function logRetrievalTime(
  label: string,
  startTime: number,
  resultCount?: number
): void {
  if (isDev) {
    const elapsed = Date.now() - startTime;
    const countStr = resultCount !== undefined ? ` (${resultCount} results)` : '';
    console.log(`[RETRIEVAL] ${label}: ${elapsed}ms${countStr}`);
  }
}

/**
 * Log simplified info message
 * @param message - Message to log
 */
export function logInfo(message: string): void {
  if (isDev) {
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Log error messages (always shown)
 * @param message - Error message
 * @param error - Optional error object
 */
export function logError(message: string, error?: unknown): void {
  console.error(`[ERROR] ${message}`, error ?? '');
}

/**
 * Create a timer utility for measuring operations
 * @param label - Label for the timer
 * @returns Object with stop() method to log elapsed time
 */
export function createTimer(label: string): { stop: () => number } {
  const startTime = Date.now();
  
  return {
    stop: () => {
      const elapsed = Date.now() - startTime;
      if (isDev) {
        console.log(`[TIMER] ${label}: ${elapsed}ms`);
      }
      return elapsed;
    },
  };
}
