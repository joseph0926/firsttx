export { handoff } from './handoff';
export { setupCapture } from './capture';
export { boot } from './boot';
export { createFirstTxRoot } from './helpers';

export {
  PrepaintError,
  BootError,
  CaptureError,
  HydrationError,
  PrepaintStorageError,
  convertDOMException,
} from './errors';

export type { HandoffStrategy } from './handoff';
export type { CreateFirstTxRootOptions } from './helpers';
