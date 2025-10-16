/**
 * Shared types for the extension
 */

// Message types for communication between extension components
export enum MessageType {
  // Identity operations
  GET_IDENTITY = 'GET_IDENTITY',
  GENERATE_IDENTITY = 'GENERATE_IDENTITY',
  IS_INITIALIZED = 'IS_INITIALIZED',

  // Data operations
  GET_PROFILE = 'GET_PROFILE',
  LIST_DATA = 'LIST_DATA',
  READ_DOCUMENT = 'READ_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',

  // Permission operations
  GRANT_ACCESS = 'GRANT_ACCESS',
  REVOKE_ACCESS = 'REVOKE_ACCESS',
  GET_PERMISSIONS = 'GET_PERMISSIONS',
  GET_DOCUMENT_APPS = 'GET_DOCUMENT_APPS',

  // Activity operations
  GET_ACTIVITY_LOGS = 'GET_ACTIVITY_LOGS',

  // App communication
  REQUEST_PERMISSION = 'REQUEST_PERMISSION',
  REQUEST_DID = 'REQUEST_DID',
}

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface UserIdentity {
  did: string;
  publicKey: string;
}
