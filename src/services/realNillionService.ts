import { Keypair } from '@nillion/nuc';
import browser from 'webextension-polyfill';
import { 
  ActivityType, 
  startActivity, 
  completeActivity, 
  addSubStep,
  logActivity as logEnhancedActivity
} from './activityLogger';

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  owner: string;
}

export interface Permission {
  documentId: string;
  grantee: string;
  read: boolean;
  write: boolean;
  execute: boolean;
  grantedAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'document_created' | 'document_deleted' | 'permission_granted' | 'permission_revoked' | 'document_accessed';
  documentId?: string;
  grantee?: string;
  timestamp: string;
  details: string;
}

/**
 * Simplified Nillion service for browser extension
 * This implements a working storage system that will be enhanced with real Nillion API integration
 */
export class NillionService {
  private static instance: NillionService;
  private isReady = false;
  private userKeypair: Keypair | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): NillionService {
    if (!NillionService.instance) {
      NillionService.instance = new NillionService();
    }
    return NillionService.instance;
  }

  async initialize(userKeypair: Keypair): Promise<void> {
    try {
      this.userKeypair = userKeypair;
      this.isReady = true;
      console.log('🚀 Nillion service initialized with user keypair:', this.userKeypair.toDid().toString());
    } catch (error) {
      console.error('Failed to initialize Nillion service:', error);
      throw error;
    }
  }

  async createDocument(title: string, content: string): Promise<Document> {
    if (!this.isReady || !this.userKeypair) {
      throw new Error('Service not initialized');
    }

    // Start tracking activity with sub-steps
    const activityId = await startActivity(
      ActivityType.DOCUMENT_CREATED,
      `Creating document "${title}"`,
      { title, contentLength: content.length },
      this.userKeypair.toDid().toString()
    );

    try {
      // Sub-step 1: Generate document ID
      await addSubStep(activityId, 'Generating unique document ID', 'in_progress');
      const docId = this.generateId();
      await addSubStep(activityId, `Document ID generated: ${docId}`, 'completed', { documentId: docId });

      // Sub-step 2: Create document object
      await addSubStep(activityId, 'Creating document structure', 'in_progress');
      const document: Document = {
        id: docId,
        title,
        content,
        createdAt: new Date().toISOString(),
        owner: this.userKeypair.toDid().toString()
      };
      await addSubStep(activityId, 'Document structure created', 'completed');

      // Sub-step 3: Store in browser storage
      await addSubStep(activityId, 'Storing document in secure storage', 'in_progress');
      await this.storeDocument(document);
      await addSubStep(activityId, 'Document stored successfully', 'completed');

      // Sub-step 4: Log activity
      await addSubStep(activityId, 'Logging activity', 'in_progress');
      await this.logActivity({
        id: this.generateId(),
        type: 'document_created',
        documentId: document.id,
        timestamp: new Date().toISOString(),
        details: `Created document "${title}"`
      });
      await addSubStep(activityId, 'Activity logged', 'completed');

      // Complete the activity
      await completeActivity(activityId, 'success');

      console.log('📝 Document created:', document.id);
      return document;
    } catch (error) {
      await addSubStep(activityId, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'failed');
      await completeActivity(activityId, 'failed');
      throw error;
    }
  }

  async listDocuments(): Promise<Document[]> {
    console.log('=== listDocuments called ===');
    console.log('Service ready:', this.isReady);
    console.log('User keypair available:', !!this.userKeypair);
    
    if (!this.isReady || !this.userKeypair) {
      console.log('Service not ready, returning empty array');
      return [];
    }

    try {
      const userDid = this.userKeypair.toDid().toString();
      console.log('User DID:', userDid);
      
      const result = await browser.storage.local.get('nillion_documents');
      const allDocuments: Document[] = result.nillion_documents || [];
      console.log('All documents from storage:', allDocuments);
      
      // Return only user's documents
      const userDocuments = allDocuments.filter(doc => doc.owner === userDid);
      console.log('Filtered user documents:', userDocuments);
      
      return userDocuments;
    } catch (error) {
      console.error('Error in listDocuments:', error);
      return [];
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    const documents = await this.listDocuments();
    return documents.find(doc => doc.id === documentId) || null;
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.isReady || !this.userKeypair) {
      throw new Error('Service not initialized');
    }

    // Start tracking activity with sub-steps
    const activityId = await startActivity(
      ActivityType.DOCUMENT_DELETED,
      `Deleting document ${documentId}`,
      { documentId },
      this.userKeypair.toDid().toString()
    );

    try {
      // Sub-step 1: Locate document
      await addSubStep(activityId, 'Locating document in storage', 'in_progress');
      const result = await browser.storage.local.get('nillion_documents');
      const documents: Document[] = result.nillion_documents || [];
      const userDid = this.userKeypair.toDid().toString();
      
      const documentIndex = documents.findIndex(doc => doc.id === documentId && doc.owner === userDid);
      if (documentIndex === -1) {
        await addSubStep(activityId, 'Document not found or unauthorized', 'failed');
        await completeActivity(activityId, 'failed');
        throw new Error('Document not found or unauthorized');
      }
      await addSubStep(activityId, 'Document located', 'completed');

      // Sub-step 2: Remove from storage
      await addSubStep(activityId, 'Removing document from storage', 'in_progress');
      const document = documents[documentIndex];
      documents.splice(documentIndex, 1);
      await browser.storage.local.set({ nillion_documents: documents });
      await addSubStep(activityId, 'Document removed from storage', 'completed');

      // Sub-step 3: Log activity
      await addSubStep(activityId, 'Logging deletion activity', 'in_progress');
      await this.logActivity({
        id: this.generateId(),
        type: 'document_deleted',
        documentId,
        timestamp: new Date().toISOString(),
        details: `Deleted document "${document.title}"`
      });
      await addSubStep(activityId, 'Activity logged', 'completed');

      // Complete the activity
      await completeActivity(activityId, 'success');

      console.log('🗑️ Document deleted:', documentId);
    } catch (error) {
      await addSubStep(activityId, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'failed');
      await completeActivity(activityId, 'failed');
      throw error;
    }
  }

  async grantPermission(documentId: string, granteeDid: string, permissions: { read?: boolean; write?: boolean; execute?: boolean }): Promise<void> {
    if (!this.isReady || !this.userKeypair) {
      throw new Error('Service not initialized');
    }

    // Start tracking activity with sub-steps
    const activityId = await startActivity(
      ActivityType.PERMISSION_GRANTED,
      `Granting permissions for document ${documentId}`,
      { documentId, grantee: granteeDid, permissions },
      this.userKeypair.toDid().toString()
    );

    try {
      // Sub-step 1: Validate permissions
      await addSubStep(activityId, 'Validating permission request', 'in_progress');
      const permTypes = [];
      if (permissions.read) permTypes.push('read');
      if (permissions.write) permTypes.push('write');
      if (permissions.execute) permTypes.push('execute');
      await addSubStep(activityId, `Permissions to grant: ${permTypes.join(', ')}`, 'completed');

      // Sub-step 2: Create permission object
      await addSubStep(activityId, 'Creating permission record', 'in_progress');
      const permission: Permission = {
        documentId,
        grantee: granteeDid,
        read: permissions.read || false,
        write: permissions.write || false,
        execute: permissions.execute || false,
        grantedAt: new Date().toISOString()
      };
      await addSubStep(activityId, 'Permission record created', 'completed');

      // Sub-step 3: Store permission
      await addSubStep(activityId, 'Storing permission in secure storage', 'in_progress');
      await this.storePermission(permission);
      await addSubStep(activityId, 'Permission stored successfully', 'completed');

      // Sub-step 4: Log activity
      await addSubStep(activityId, 'Logging permission grant', 'in_progress');
      await this.logActivity({
        id: this.generateId(),
        type: 'permission_granted',
        documentId,
        grantee: granteeDid,
        timestamp: new Date().toISOString(),
        details: `Granted permissions to ${granteeDid}`
      });
      await addSubStep(activityId, 'Activity logged', 'completed');

      // Complete the activity
      await completeActivity(activityId, 'success');

      console.log('🔑 Permission granted:', permission);
    } catch (error) {
      await addSubStep(activityId, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'failed');
      await completeActivity(activityId, 'failed');
      throw error;
    }
  }

  async revokePermission(documentId: string, granteeDid: string): Promise<void> {
    if (!this.isReady || !this.userKeypair) {
      throw new Error('Service not initialized');
    }

    const result = await browser.storage.local.get('nillion_permissions');
    const permissions: Permission[] = result.nillion_permissions || [];
    
    const filteredPermissions = permissions.filter(
      perm => !(perm.documentId === documentId && perm.grantee === granteeDid)
    );
    
    await browser.storage.local.set({ nillion_permissions: filteredPermissions });

    // Log activity
    await this.logActivity({
      id: this.generateId(),
      type: 'permission_revoked',
      documentId,
      grantee: granteeDid,
      timestamp: new Date().toISOString(),
      details: `Revoked permissions from ${granteeDid}`
    });

    console.log('🚫 Permission revoked');
  }

  async listPermissions(documentId?: string): Promise<Permission[]> {
    const result = await browser.storage.local.get('nillion_permissions');
    const permissions: Permission[] = result.nillion_permissions || [];
    
    if (documentId) {
      return permissions.filter(perm => perm.documentId === documentId);
    }
    
    return permissions;
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    const result = await browser.storage.local.get('nillion_activity_logs');
    const logs: ActivityLog[] = result.nillion_activity_logs || [];
    
    // Return logs sorted by most recent first
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getUserDid(): string | null {
    return this.userKeypair ? this.userKeypair.toDid().toString() : null;
  }

  isServiceReady(): boolean {
    return this.isReady;
  }

  private async storeDocument(document: Document): Promise<void> {
    const result = await browser.storage.local.get('nillion_documents');
    const documents: Document[] = result.nillion_documents || [];
    documents.push(document);
    await browser.storage.local.set({ nillion_documents: documents });
  }

  private async storePermission(permission: Permission): Promise<void> {
    const result = await browser.storage.local.get('nillion_permissions');
    const permissions: Permission[] = result.nillion_permissions || [];
    
    // Remove existing permission for same document/grantee
    const filteredPermissions = permissions.filter(
      perm => !(perm.documentId === permission.documentId && perm.grantee === permission.grantee)
    );
    
    filteredPermissions.push(permission);
    await browser.storage.local.set({ nillion_permissions: filteredPermissions });
  }

  private async logActivity(activity: ActivityLog): Promise<void> {
    const result = await browser.storage.local.get('nillion_activity_logs');
    const logs: ActivityLog[] = result.nillion_activity_logs || [];
    logs.push(activity);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    await browser.storage.local.set({ nillion_activity_logs: logs });
  }

  private generateId(): string {
    return 'nillion_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const nillionService = NillionService.getInstance();