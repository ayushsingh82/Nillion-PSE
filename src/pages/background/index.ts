/**
 * Background Service Worker
 * Handles communication between web apps and the extension
 * Manages Nillion Private Storage operations
 */

import browser from 'webextension-polyfill';
import { MessageType, Message } from '../../types/index';
import {
  getStoredIdentity,
  generateIdentity,
  isInitialized,
} from '../../services/secureStorage';
import {
  getUserProfile,
  listUserData,
  readDocument,
  deleteDocument,
  grantAccess,
  revokeAccess,
} from '../../services/nillionClient';
import {
  logActivity,
  ActivityType,
  getActivityLogs,
} from '../../services/activityLogger';
import {
  getAppPermissions,
  getDocumentApps,
} from '../../services/permissionManager';

console.log('Nillion Private Storage Extension - Background script loaded');

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener(
  async (
    message: Message,
    sender: browser.Runtime.MessageSender
  ): Promise<unknown> => {
    try {
      console.log('Received message:', message.type, sender);

      switch (message.type) {
        case MessageType.IS_INITIALIZED: {
          console.log('=== IS_INITIALIZED request ===');
          const initialized = await isInitialized();
          console.log('Initialization check result:', initialized);
          return initialized;
        }

        case MessageType.GET_IDENTITY: {
          console.log('=== GET_IDENTITY request ===');
          const identity = await getStoredIdentity();
          console.log('Retrieved identity from storage:', {
            hasIdentity: !!identity,
            did: identity?.did,
            hasKeypair: !!identity?.keypair,
            hasPrivateKey: !!identity?.keypair?.privateKey
          });
          
          if (!identity) {
            console.warn('No identity found in storage');
            throw new Error('No identity found. Please initialize first.');
          }
          
          const response = {
            did: identity.did,
            publicKey: identity.keypair.publicKey,
            privateKey: identity.keypair.privateKey  // Send private key string instead of keypair object
          };
          
          console.log('Returning transformed identity:', {
            did: response.did,
            hasPublicKey: !!response.publicKey,
            hasPrivateKey: !!response.privateKey
          });
          
          return response;
        }

        case MessageType.GENERATE_IDENTITY: {
          const identity = await generateIdentity();
          await logActivity(
            ActivityType.IDENTITY_CREATED,
            'New identity created',
            { did: identity.did }
          );
          
          return {
            did: identity.did,
            publicKey: identity.keypair.publicKey,
            privateKey: identity.keypair.privateKey  // Send private key string instead of keypair object
          };
        }

        case MessageType.GET_PROFILE: {
          const profile = await getUserProfile();
          return profile;
        }

        case MessageType.LIST_DATA: {
          const dataList = await listUserData();
          return dataList;
        }

        case MessageType.READ_DOCUMENT: {
          const { collectionId, documentId } = message.payload as {
            collectionId: string;
            documentId: string;
          };
          const doc = await readDocument(collectionId, documentId);
          await logActivity(
            ActivityType.DOCUMENT_READ,
            `Read document ${documentId} from collection ${collectionId}`,
            { collectionId, documentId }
          );
          return doc;
        }

        case MessageType.DELETE_DOCUMENT: {
          const { collectionId, documentId } = message.payload as {
            collectionId: string;
            documentId: string;
          };
          const result = await deleteDocument(collectionId, documentId);
          await logActivity(
            ActivityType.DOCUMENT_DELETED,
            `Deleted document ${documentId} from collection ${collectionId}`,
            { collectionId, documentId }
          );
          return result;
        }

        case MessageType.GRANT_ACCESS: {
          const { collectionId, documentId, grantee, permissions } =
            message.payload as {
              collectionId: string;
              documentId: string;
              grantee: string;
              permissions: { read: boolean; write: boolean; execute: boolean };
            };
          const result = await grantAccess(
            collectionId,
            documentId,
            grantee,
            permissions
          );
          return result;
        }

        case MessageType.REVOKE_ACCESS: {
          const { collectionId, documentId, grantee } = message.payload as {
            collectionId: string;
            documentId: string;
            grantee: string;
          };
          const result = await revokeAccess(collectionId, documentId, grantee);
          return result;
        }

        case MessageType.GET_PERMISSIONS: {
          const permissions = await getAppPermissions();
          return permissions;
        }

        case MessageType.GET_DOCUMENT_APPS: {
          const { collectionId, documentId } = message.payload as {
            collectionId: string;
            documentId: string;
          };
          const apps = await getDocumentApps(collectionId, documentId);
          return apps;
        }

        case MessageType.GET_ACTIVITY_LOGS: {
          const { limit } = (message.payload || {}) as { limit?: number };
          const logs = await getActivityLogs(limit);
          return logs;
        }

        case MessageType.REQUEST_PERMISSION: {
          // This would typically show a popup for user approval
          const {
            appDid,
            appName,
            appOrigin,
            collectionId,
            documentId,
            permissions,
          } = message.payload as {
            appDid: string;
            appName: string;
            appOrigin: string;
            collectionId: string;
            documentId: string;
            permissions: { read: boolean; write: boolean; execute: boolean };
          };

          // For now, we'll log it and return pending
          // In a full implementation, this would open a confirmation dialog
          console.log('Permission request:', {
            appDid,
            appName,
            appOrigin,
            collectionId,
            documentId,
            permissions,
          });

          return {
            status: 'pending',
            message: 'Permission request requires user approval',
          };
        }

        case MessageType.REQUEST_DID: {
          // Apps can request the user's DID
          const identity = await getStoredIdentity();
          if (!identity) {
            return { error: 'No identity initialized' };
          }

          const appOrigin = sender.url || 'unknown';
          await logActivity(
            ActivityType.APP_CONNECTED,
            `App requested DID: ${appOrigin}`,
            { origin: appOrigin }
          );

          return {
            did: identity.did,
            publicKey: identity.keypair.publicKey,
          };
        }

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return {
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);

// Handle external messages from web apps
browser.runtime.onMessageExternal.addListener(
  async (message: Message, sender: browser.Runtime.MessageSender) => {
    console.log('External message received:', message, sender);

    // Only allow specific messages from external sources
    const allowedTypes = [MessageType.REQUEST_DID, MessageType.REQUEST_PERMISSION];

    if (!allowedTypes.includes(message.type)) {
      return { error: 'Message type not allowed from external sources' };
    }

    // Process the message using the same handler
    return browser.runtime.sendMessage(message);
  }
);

console.log('Background script initialized successfully');

