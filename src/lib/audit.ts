import { getDb } from './db';
import { AuditLogDoc } from '@/models/types';

export interface RecordAuditParams {
  messId?: string;
  cycleId?: string;
  performedByUserId: string;
  performedByUserName?: string;
  action: string;
  targetCollection: string;
  targetId?: string;
  previousValue?: any;
  newValue?: any;
}

/**
 * Pure helper to build an audit log document with previousValue and newValue.
 */
export function createAuditLogEntry(params: RecordAuditParams): AuditLogDoc {
  return {
    messId: params.messId || 'mess_1',
    cycleId: params.cycleId,
    performedByUserId: params.performedByUserId,
    performedByUserName: params.performedByUserName || 'System',
    action: params.action,
    targetCollection: params.targetCollection,
    targetId: params.targetId,
    previousValue: params.previousValue !== undefined ? params.previousValue : null,
    newValue: params.newValue !== undefined ? params.newValue : null,
    createdAt: new Date(),
  };
}

/**
 * Persists an audit log to MongoDB 'audit_logs' collection.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const logEntry = createAuditLogEntry(params);
    await db.collection('audit_logs').insertOne(logEntry as any);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
