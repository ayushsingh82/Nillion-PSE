/**
 * Permission Management Service
 * Manages app permissions and access control for data documents
 */

import browser from 'webextension-polyfill';
import { grantAccess, revokeAccess, getDocumentPermissions } from './nillionClient';
import { logActivity, ActivityType } from './activityLogger';

const STORAGE_KEY = 'nillion_app_permissions';

export interface AppPermission {
  appDid: string;
  appName: string;
  appOrigin: string;
  grantedAt: number;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  documents: Array<{
    collectionId: string;
    documentId: string;
  }>;
}

export interface PermissionRequest {
  appDid: string;
  appName: string;
  appOrigin: string;
  collectionId: string;
  documentId: string;
  requestedPermissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}

/**
 * Store app permission grant
 */
export async function storeAppPermission(
  permission: AppPermission
): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const permissions: AppPermission[] = result[STORAGE_KEY] || [];

  // Check if permission already exists for this app
  const existingIndex = permissions.findIndex(
    (p) => p.appDid === permission.appDid
  );

  if (existingIndex >= 0) {
    // Update existing permission
    permissions[existingIndex] = permission;
  } else {
    // Add new permission
    permissions.push(permission);
  }

  await browser.storage.local.set({ [STORAGE_KEY]: permissions });
}

/**
 * Get all stored app permissions
 */
export async function getAppPermissions(): Promise<AppPermission[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

/**
 * Get permission for a specific app
 */
export async function getAppPermission(
  appDid: string
): Promise<AppPermission | null> {
  const permissions = await getAppPermissions();
  return permissions.find((p) => p.appDid === appDid) || null;
}

/**
 * Grant access to an app for a specific document
 */
export async function grantAppAccess(
  appDid: string,
  appName: string,
  appOrigin: string,
  collectionId: string,
  documentId: string,
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  }
): Promise<void> {
  // Grant access via Nillion API
  await grantAccess(collectionId, documentId, appDid, permissions);

  // Store permission locally
  let appPermission = await getAppPermission(appDid);
  if (!appPermission) {
    appPermission = {
      appDid,
      appName,
      appOrigin,
      grantedAt: Date.now(),
      permissions,
      documents: [],
    };
  }

  // Add document to app's access list if not already present
  const docExists = appPermission.documents.some(
    (doc) => doc.collectionId === collectionId && doc.documentId === documentId
  );

  if (!docExists) {
    appPermission.documents.push({ collectionId, documentId });
  }

  await storeAppPermission(appPermission);

  // Log the activity
  await logActivity(
    ActivityType.PERMISSION_GRANTED,
    `Granted ${Object.keys(permissions).filter((k) => permissions[k as keyof typeof permissions]).join(', ')} access to ${appName}`,
    {
      appDid,
      appName,
      collectionId,
      documentId,
      permissions,
    }
  );
}

/**
 * Revoke access from an app for a specific document
 */
export async function revokeAppAccess(
  appDid: string,
  collectionId: string,
  documentId: string
): Promise<void> {
  // Revoke access via Nillion API
  await revokeAccess(collectionId, documentId, appDid);

  // Update local storage
  const appPermission = await getAppPermission(appDid);
  if (appPermission) {
    appPermission.documents = appPermission.documents.filter(
      (doc) =>
        !(doc.collectionId === collectionId && doc.documentId === documentId)
    );

    if (appPermission.documents.length === 0) {
      // Remove app permission entirely if no documents left
      await removeAppPermission(appDid);
    } else {
      await storeAppPermission(appPermission);
    }
  }

  // Log the activity
  await logActivity(
    ActivityType.PERMISSION_REVOKED,
    `Revoked access from app (DID: ${appDid})`,
    {
      appDid,
      collectionId,
      documentId,
    }
  );
}

/**
 * Revoke all access for an app
 */
export async function revokeAllAppAccess(appDid: string): Promise<void> {
  const appPermission = await getAppPermission(appDid);
  if (!appPermission) return;

  // Revoke access for each document
  for (const doc of appPermission.documents) {
    await revokeAccess(doc.collectionId, doc.documentId, appDid);
  }

  // Remove app permission
  await removeAppPermission(appDid);

  // Log the activity
  await logActivity(
    ActivityType.PERMISSION_REVOKED,
    `Revoked all access from ${appPermission.appName}`,
    {
      appDid,
      appName: appPermission.appName,
      documentsCount: appPermission.documents.length,
    }
  );
}

/**
 * Remove app permission from storage
 */
async function removeAppPermission(appDid: string): Promise<void> {
  const permissions = await getAppPermissions();
  const filtered = permissions.filter((p) => p.appDid !== appDid);
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
}

/**
 * Get all apps that have access to a specific document
 */
export async function getDocumentApps(
  collectionId: string,
  documentId: string
): Promise<AppPermission[]> {
  const permissions = await getAppPermissions();
  return permissions.filter((p) =>
    p.documents.some(
      (doc) => doc.collectionId === collectionId && doc.documentId === documentId
    )
  );
}

/**
 * Verify document permissions from blockchain
 */
export async function verifyDocumentPermissions(
  collectionId: string,
  documentId: string
): Promise<Array<{ grantee: string; read: boolean; write: boolean; execute: boolean }>> {
  return await getDocumentPermissions(collectionId, documentId);
}

/**
 * Clear all app permissions
 */
export async function clearAllAppPermissions(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

/**
 * Export app permissions as JSON
 */
export async function exportAppPermissions(): Promise<string> {
  const permissions = await getAppPermissions();
  return JSON.stringify(permissions, null, 2);
}
