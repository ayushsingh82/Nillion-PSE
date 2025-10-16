/**
 * Activity Log Service
 * Tracks all operations and permission changes for audit trail
 */

import browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';

export enum ActivityType {
  IDENTITY_CREATED = 'IDENTITY_CREATED',
  IDENTITY_IMPORTED = 'IDENTITY_IMPORTED',
  IDENTITY_EXPORTED = 'IDENTITY_EXPORTED',
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_READ = 'DOCUMENT_READ',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  COLLECTION_VIEWED = 'COLLECTION_VIEWED',
  APP_CONNECTED = 'APP_CONNECTED',
  APP_DISCONNECTED = 'APP_DISCONNECTED',
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: ActivityType;
  description: string;
  details?: Record<string, unknown>;
  userDid?: string;
}

const STORAGE_KEY = 'nillion_activity_logs';
const MAX_LOGS = 1000; // Keep last 1000 activities

/**
 * Add a new activity log entry
 */
export async function logActivity(
  type: ActivityType,
  description: string,
  details?: Record<string, unknown>,
  userDid?: string
): Promise<void> {
  const log: ActivityLog = {
    id: uuidv4(),
    timestamp: Date.now(),
    type,
    description,
    details,
    userDid,
  };

  const result = await browser.storage.local.get(STORAGE_KEY);
  let logs: ActivityLog[] = result[STORAGE_KEY] || [];

  // Add new log at the beginning
  logs.unshift(log);

  // Keep only the most recent MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }

  await browser.storage.local.set({ [STORAGE_KEY]: logs });
}

/**
 * Get all activity logs
 */
export async function getActivityLogs(limit?: number): Promise<ActivityLog[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  let logs: ActivityLog[] = result[STORAGE_KEY] || [];

  if (limit && limit > 0) {
    logs = logs.slice(0, limit);
  }

  return logs;
}

/**
 * Get activity logs filtered by type
 */
export async function getActivityLogsByType(
  type: ActivityType,
  limit?: number
): Promise<ActivityLog[]> {
  const logs = await getActivityLogs();
  let filtered = logs.filter((log) => log.type === type);

  if (limit && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Get activity logs for a specific time range
 */
export async function getActivityLogsByTimeRange(
  startTime: number,
  endTime: number
): Promise<ActivityLog[]> {
  const logs = await getActivityLogs();
  return logs.filter(
    (log) => log.timestamp >= startTime && log.timestamp <= endTime
  );
}

/**
 * Clear all activity logs
 */
export async function clearActivityLogs(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

/**
 * Export activity logs as JSON
 */
export async function exportActivityLogs(): Promise<string> {
  const logs = await getActivityLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Get activity statistics
 */
export async function getActivityStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  lastActivity?: ActivityLog;
}> {
  const logs = await getActivityLogs();

  const byType: Record<string, number> = {};
  logs.forEach((log) => {
    byType[log.type] = (byType[log.type] || 0) + 1;
  });

  return {
    total: logs.length,
    byType,
    lastActivity: logs[0],
  };
}

/**
 * Search activity logs
 */
export async function searchActivityLogs(
  query: string
): Promise<ActivityLog[]> {
  const logs = await getActivityLogs();
  const lowerQuery = query.toLowerCase();

  return logs.filter(
    (log) =>
      log.description.toLowerCase().includes(lowerQuery) ||
      log.type.toLowerCase().includes(lowerQuery) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(lowerQuery))
  );
}
