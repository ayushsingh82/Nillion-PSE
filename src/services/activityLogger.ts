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
  AUTOFILL_EXECUTED = 'AUTOFILL_EXECUTED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  SECURITY_CHANGED = 'SECURITY_CHANGED',
}

export interface ActivitySubStep {
  order: number;
  description: string;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: ActivityType;
  description: string;
  status: 'success' | 'failed' | 'warning';
  details?: Record<string, unknown>;
  userDid?: string;
  subSteps?: ActivitySubStep[];
  duration?: number; // Duration in milliseconds
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
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
  userDid?: string,
  subSteps?: ActivitySubStep[],
  status: 'success' | 'failed' | 'warning' = 'success'
): Promise<string> {
  const log: ActivityLog = {
    id: uuidv4(),
    timestamp: Date.now(),
    type,
    description,
    status,
    details,
    userDid,
    subSteps,
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
  
  return log.id; // Return log ID for potential updates
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
 * Export activity logs as CSV
 */
export async function exportActivityLogsAsCSV(): Promise<string> {
  const logs = await getActivityLogs();
  
  if (logs.length === 0) {
    return 'No logs to export';
  }

  // CSV Headers
  const headers = ['ID', 'Timestamp', 'Date', 'Type', 'Description', 'Status', 'Duration (ms)', 'User DID', 'Details', 'Sub Steps'];
  
  // CSV Rows
  const rows = logs.map(log => {
    const date = new Date(log.timestamp).toISOString();
    const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
    const subSteps = log.subSteps ? log.subSteps.map(s => `${s.order}. ${s.description} [${s.status}]`).join('; ') : '';
    
    return [
      log.id,
      log.timestamp,
      date,
      log.type,
      `"${log.description.replace(/"/g, '""')}"`,
      log.status,
      log.duration || '',
      log.userDid || '',
      `"${details}"`,
      `"${subSteps}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download activity logs as a file
 */
export async function downloadActivityLogs(format: 'json' | 'csv' = 'json'): Promise<void> {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'csv') {
    content = await exportActivityLogsAsCSV();
    filename = `nillion-activity-logs-${Date.now()}.csv`;
    mimeType = 'text/csv';
  } else {
    content = await exportActivityLogs();
    filename = `nillion-activity-logs-${Date.now()}.json`;
    mimeType = 'application/json';
  }

  // Create blob and download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
  
  // Log the export activity
  await logActivity(
    ActivityType.DATA_EXPORTED,
    `Activity logs exported as ${format.toUpperCase()}`,
    { format, filename, count: (await getActivityLogs()).length },
    undefined,
    undefined,
    'success'
  );
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

/**
 * Update an existing activity log (useful for adding sub-steps or updating status)
 */
export async function updateActivityLog(
  logId: string,
  updates: Partial<ActivityLog>
): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  let logs: ActivityLog[] = result[STORAGE_KEY] || [];

  const logIndex = logs.findIndex(log => log.id === logId);
  if (logIndex !== -1) {
    logs[logIndex] = { ...logs[logIndex], ...updates };
    await browser.storage.local.set({ [STORAGE_KEY]: logs });
  }
}

/**
 * Add a sub-step to an existing activity log
 */
export async function addSubStep(
  logId: string,
  description: string,
  status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'completed',
  details?: Record<string, unknown>
): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  let logs: ActivityLog[] = result[STORAGE_KEY] || [];

  const logIndex = logs.findIndex(log => log.id === logId);
  if (logIndex !== -1) {
    const log = logs[logIndex];
    const subSteps = log.subSteps || [];
    
    const newSubStep: ActivitySubStep = {
      order: subSteps.length + 1,
      description,
      timestamp: Date.now(),
      status,
      details
    };
    
    logs[logIndex].subSteps = [...subSteps, newSubStep];
    await browser.storage.local.set({ [STORAGE_KEY]: logs });
  }
}

/**
 * Start tracking a complex activity with sub-steps
 */
export async function startActivity(
  type: ActivityType,
  description: string,
  details?: Record<string, unknown>,
  userDid?: string
): Promise<string> {
  const logId = await logActivity(type, description, details, userDid, [], 'success');
  return logId;
}

/**
 * Complete a tracked activity and calculate duration
 */
export async function completeActivity(
  logId: string,
  status: 'success' | 'failed' | 'warning' = 'success'
): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  let logs: ActivityLog[] = result[STORAGE_KEY] || [];

  const logIndex = logs.findIndex(log => log.id === logId);
  if (logIndex !== -1) {
    const log = logs[logIndex];
    const duration = Date.now() - log.timestamp;
    
    logs[logIndex] = {
      ...log,
      status,
      duration
    };
    
    await browser.storage.local.set({ [STORAGE_KEY]: logs });
  }
}

/**
 * Get activity log statistics with more detailed metrics
 */
export async function getDetailedActivityStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  lastActivity?: ActivityLog;
  todayCount: number;
  weekCount: number;
  averageDuration?: number;
}> {
  const logs = await getActivityLogs();

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  let todayCount = 0;
  let weekCount = 0;

  logs.forEach((log) => {
    byType[log.type] = (byType[log.type] || 0) + 1;
    byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    
    if (log.duration) {
      totalDuration += log.duration;
      durationCount++;
    }

    if (log.timestamp >= todayStart) {
      todayCount++;
    }
    if (log.timestamp >= weekStart) {
      weekCount++;
    }
  });

  return {
    total: logs.length,
    byType,
    byStatus,
    lastActivity: logs[0],
    todayCount,
    weekCount,
    averageDuration: durationCount > 0 ? totalDuration / durationCount : undefined
  };
}
