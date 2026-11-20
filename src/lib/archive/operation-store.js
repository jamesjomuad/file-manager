/**
 * In-memory store for tracking extraction operations
 * 
 * Maps operation IDs to their current state, including progress,
 * cancellation tokens, and metadata.
 * 
 * @module archive/operation-store
 */

/**
 * @typedef {'preparing'|'extracting'|'finalizing'|'completed'|'failed'|'cancelled'} OperationStatus
 */

/**
 * @typedef {Object} ExtractionOperation
 * @property {string} id - Unique operation identifier
 * @property {OperationStatus} status - Current status
 * @property {string} archivePath - Path to the archive being extracted
 * @property {string} destPath - Destination directory
 * @property {number} totalEntries - Total number of entries to extract
 * @property {number} processedEntries - Number of entries processed so far
 * @property {number} extractedFiles - Number of files successfully extracted
 * @property {number} skippedFiles - Number of files skipped
 * @property {string|null} currentEntry - Name of the entry currently being extracted
 * @property {number} totalBytes - Total uncompressed bytes
 * @property {number} extractedBytes - Bytes extracted so far
 * @property {number} startTime - Operation start timestamp
 * @property {number} lastUpdate - Last progress update timestamp
 * @property {string[]} errors - Array of error messages
 * @property {{cancelled: boolean}} cancelToken - Cancellation token
 * @property {Array<function>} eventListeners - SSE event listeners
 */

/**
 * Map of operation ID to operation state
 * @type {Map<string, ExtractionOperation>}
 */
const operations = new Map();

/**
 * Cleanup interval for completed operations (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Create a new extraction operation
 * 
 * @param {Object} options
 * @param {string} options.archivePath - Archive path
 * @param {string} options.destPath - Destination path
 * @returns {ExtractionOperation} The created operation
 */
export function createOperation({ archivePath, destPath }) {
  const id = crypto.randomUUID();
  
  /** @type {ExtractionOperation} */
  const operation = {
    id,
    status: 'preparing',
    archivePath,
    destPath,
    totalEntries: 0,
    processedEntries: 0,
    extractedFiles: 0,
    skippedFiles: 0,
    currentEntry: null,
    totalBytes: 0,
    extractedBytes: 0,
    startTime: Date.now(),
    lastUpdate: Date.now(),
    errors: [],
    cancelToken: { cancelled: false },
    eventListeners: [],
  };
  
  operations.set(id, operation);
  
  // Schedule cleanup
  setTimeout(() => {
    if (operations.has(id)) {
      const op = operations.get(id);
      // Only cleanup if the operation is in a terminal state
      if (['completed', 'failed', 'cancelled'].includes(op.status)) {
        operations.delete(id);
      }
    }
  }, CLEANUP_INTERVAL);
  
  return operation;
}

/**
 * Get an operation by ID
 * 
 * @param {string} id - Operation ID
 * @returns {ExtractionOperation|null} The operation or null if not found
 */
export function getOperation(id) {
  return operations.get(id) || null;
}

/**
 * Update an operation's state
 * 
 * @param {string} id - Operation ID
 * @param {Partial<ExtractionOperation>} updates - Fields to update
 * @returns {ExtractionOperation|null} The updated operation or null if not found
 */
export function updateOperation(id, updates) {
  const operation = operations.get(id);
  if (!operation) return null;
  
  const updated = {
    ...operation,
    ...updates,
    lastUpdate: Date.now(),
  };
  
  operations.set(id, updated);
  
  // Notify event listeners
  updated.eventListeners.forEach(listener => {
    try {
      listener(updated);
    } catch (err) {
      console.error('Error in operation event listener:', err);
    }
  });
  
  return updated;
}

/**
 * Cancel an operation
 * 
 * @param {string} id - Operation ID
 * @returns {boolean} True if the operation was cancelled, false if not found or already cancelled
 */
export function cancelOperation(id) {
  const operation = operations.get(id);
  if (!operation) return false;
  
  if (['completed', 'failed', 'cancelled'].includes(operation.status)) {
    return false;
  }
  
  operation.cancelToken.cancelled = true;
  updateOperation(id, { status: 'cancelled' });
  
  return true;
}

/**
 * Add an event listener for operation updates
 * 
 * @param {string} id - Operation ID
 * @param {function} listener - Callback function
 * @returns {boolean} True if the listener was added, false if operation not found
 */
export function addEventListener(id, listener) {
  const operation = operations.get(id);
  if (!operation) return false;
  
  operation.eventListeners.push(listener);
  return true;
}

/**
 * Remove an event listener
 * 
 * @param {string} id - Operation ID
 * @param {function} listener - Callback function
 * @returns {boolean} True if the listener was removed, false if not found
 */
export function removeEventListener(id, listener) {
  const operation = operations.get(id);
  if (!operation) return false;
  
  const index = operation.eventListeners.indexOf(listener);
  if (index >= 0) {
    operation.eventListeners.splice(index, 1);
    return true;
  }
  
  return false;
}

/**
 * Get all active operations (for debugging/monitoring)
 * 
 * @returns {ExtractionOperation[]} Array of operations
 */
export function getAllOperations() {
  return Array.from(operations.values());
}

/**
 * Clean up completed operations older than the specified age
 * 
 * @param {number} maxAge - Maximum age in milliseconds
 */
export function cleanupOldOperations(maxAge = CLEANUP_INTERVAL) {
  const now = Date.now();
  
  for (const [id, operation] of operations.entries()) {
    const age = now - operation.lastUpdate;
    const isTerminal = ['completed', 'failed', 'cancelled'].includes(operation.status);
    
    if (isTerminal && age > maxAge) {
      operations.delete(id);
    }
  }
}
