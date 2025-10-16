/**
 * Enhanced Activity Log Tab Component
 * Displays detailed activity logs with sub-steps and download functionality
 */

import React, { useState, useEffect } from 'react';
import {
  getActivityLogs,
  searchActivityLogs,
  clearActivityLogs,
  downloadActivityLogs,
  getDetailedActivityStats,
  ActivityLog,
  ActivityType
} from '../services/activityLogger';

export const ActivityLogTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    todayCount: number;
    weekCount: number;
    averageDuration?: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  } | null>(null);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, filterType, filterStatus]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const activityLogs = await getActivityLogs();
      setLogs(activityLogs);
      setFilteredLogs(activityLogs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await getDetailedActivityStats();
      setStats(statistics);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const applyFilters = async () => {
    let result = [...logs];

    // Search filter
    if (searchQuery.trim()) {
      result = await searchActivityLogs(searchQuery);
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(log => log.type === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(log => log.status === filterStatus);
    }

    setFilteredLogs(result);
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all activity logs? This cannot be undone.')) {
      try {
        setLoading(true);
        await clearActivityLogs();
        await loadLogs();
        await loadStats();
      } catch (err) {
        console.error('Failed to clear logs:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      setLoading(true);
      await downloadActivityLogs(format);
      await loadLogs(); // Reload to show the export activity
    } catch (err) {
      console.error('Failed to download logs:', err);
      alert('Failed to download logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getActivityIcon = (type: ActivityType) => {
    const icons: Record<ActivityType, string> = {
      [ActivityType.IDENTITY_CREATED]: '🆔',
      [ActivityType.IDENTITY_IMPORTED]: '📥',
      [ActivityType.IDENTITY_EXPORTED]: '📤',
      [ActivityType.DOCUMENT_CREATED]: '📄',
      [ActivityType.DOCUMENT_READ]: '👁️',
      [ActivityType.DOCUMENT_DELETED]: '🗑️',
      [ActivityType.PERMISSION_GRANTED]: '✅',
      [ActivityType.PERMISSION_REVOKED]: '❌',
      [ActivityType.COLLECTION_VIEWED]: '📁',
      [ActivityType.APP_CONNECTED]: '🔗',
      [ActivityType.APP_DISCONNECTED]: '🔌',
      [ActivityType.AUTOFILL_EXECUTED]: '🔄',
      [ActivityType.DATA_EXPORTED]: '💾',
      [ActivityType.SECURITY_CHANGED]: '🔒',
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
  };

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Activity Log</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition-colors"
            title="Toggle Statistics"
          >
            {showStats ? '📊 Hide Stats' : '📊 Show Stats'}
          </button>
          <button
            onClick={() => handleDownload('json')}
            disabled={loading || logs.length === 0}
            className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
            title="Download as JSON"
          >
            💾 JSON
          </button>
          <button
            onClick={() => handleDownload('csv')}
            disabled={loading || logs.length === 0}
            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
            title="Download as CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={handleClearLogs}
            disabled={loading || logs.length === 0}
            className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
            title="Clear all logs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-sm mb-3 text-gray-800">📊 Activity Statistics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs text-gray-500">Total Activities</p>
              <p className="text-xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-xl font-bold text-green-600">{stats.todayCount}</p>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs text-gray-500">This Week</p>
              <p className="text-xl font-bold text-purple-600">{stats.weekCount}</p>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <p className="text-xs text-gray-500">Avg Duration</p>
              <p className="text-xl font-bold text-orange-600">
                {stats.averageDuration ? formatDuration(stats.averageDuration) : 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Status Breakdown */}
          <div className="mt-3 bg-white rounded p-2 border border-blue-100">
            <p className="text-xs text-gray-500 mb-2">Status Breakdown</p>
            <div className="flex gap-2">
              {Object.entries(stats.byStatus as Record<string, number>).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
                  <span className="text-xs text-gray-600 capitalize">{status}: {count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="🔍 Search activities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            {Object.values(ActivityType).map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading activities...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
              ? '🔍 No activities match your filters' 
              : '📋 No activities yet'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Your activities will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const hasSubSteps = log.subSteps && log.subSteps.length > 0;
            const hasDetails = log.details && Object.keys(log.details).length > 0;

            return (
              <div key={log.id} className="border rounded-lg bg-white hover:shadow-md transition-shadow">
                {/* Main Log Entry */}
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => (hasSubSteps || hasDetails) && toggleExpanded(log.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Indicator */}
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(log.status)}`}></div>
                    
                    {/* Icon */}
                    <div className="text-xl">{getActivityIcon(log.type)}</div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {log.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          {log.duration && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              ⏱️ {formatDuration(log.duration)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Expand indicator */}
                      {(hasSubSteps || hasDetails) && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                          <span>{isExpanded ? '▼' : '▶'}</span>
                          <span>
                            {hasSubSteps && log.subSteps && `${log.subSteps.length} sub-steps`}
                            {hasSubSteps && hasDetails && ' • '}
                            {hasDetails && 'Details'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                    {/* Sub-steps */}
                    {hasSubSteps && log.subSteps && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">📝 Sub-steps:</p>
                        <div className="space-y-2">
                          {log.subSteps.map((step, index) => (
                            <div key={index} className="flex items-start gap-2 bg-white rounded p-2 border border-gray-200">
                              <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                                {step.order}.
                              </span>
                              <div className="flex-1">
                                <p className={`text-xs font-medium ${getSubStepStatusColor(step.status)}`}>
                                  {step.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(step.timestamp).toLocaleTimeString()} • 
                                  <span className="capitalize ml-1">{step.status}</span>
                                </p>
                                {step.details && (
                                  <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                                    {JSON.stringify(step.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    {hasDetails && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">ℹ️ Details:</p>
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <pre className="text-xs text-gray-700 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {log.metadata && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">🔍 Metadata:</p>
                        <div className="bg-white rounded p-2 border border-gray-200 text-xs text-gray-600">
                          {log.metadata.location && <p>📍 Location: {log.metadata.location}</p>}
                          {log.metadata.ipAddress && <p>🌐 IP: {log.metadata.ipAddress}</p>}
                          {log.metadata.userAgent && <p className="truncate" title={log.metadata.userAgent}>
                            💻 User Agent: {log.metadata.userAgent}
                          </p>}
                        </div>
                      </div>
                    )}

                    {/* Log ID */}
                    <div className="text-xs text-gray-400">
                      ID: {log.id}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {!loading && filteredLogs.length > 0 && (
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
          Showing {filteredLogs.length} of {logs.length} activities
        </div>
      )}
    </div>
  );
};
