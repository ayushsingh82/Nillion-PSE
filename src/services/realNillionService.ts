import { Keypair } from '@nillion/nuc';
import browser from 'webextension-polyfill';

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

    const document: Document = {
      id: this.generateId(),
      title,
      content,
      createdAt: new Date().toISOString(),
      owner: this.userKeypair.toDid().toString()
    };

    // Store in browser storage
    await this.storeDocument(document);
    
    // Log activity
    await this.logActivity({
      id: this.generateId(),
      type: 'document_created',
      documentId: document.id,
      timestamp: new Date().toISOString(),
      details: `Created document "${title}"`
    });

    console.log('📝 Document created:', document.id);
    return document;
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

    const result = await browser.storage.local.get('nillion_documents');
    const documents: Document[] = result.nillion_documents || [];
    const userDid = this.userKeypair.toDid().toString();
    
    const documentIndex = documents.findIndex(doc => doc.id === documentId && doc.owner === userDid);
    if (documentIndex === -1) {
      throw new Error('Document not found or unauthorized');
    }

    const document = documents[documentIndex];
    documents.splice(documentIndex, 1);
    
    await browser.storage.local.set({ nillion_documents: documents });

    // Log activity
    await this.logActivity({
      id: this.generateId(),
      type: 'document_deleted',
      documentId,
      timestamp: new Date().toISOString(),
      details: `Deleted document "${document.title}"`
    });

    console.log('🗑️ Document deleted:', documentId);
  }

  async grantPermission(documentId: string, granteeDid: string, permissions: { read?: boolean; write?: boolean; execute?: boolean }): Promise<void> {
    if (!this.isReady || !this.userKeypair) {
      throw new Error('Service not initialized');
    }

    const permission: Permission = {
      documentId,
      grantee: granteeDid,
      read: permissions.read || false,
      write: permissions.write || false,
      execute: permissions.execute || false,
      grantedAt: new Date().toISOString()
    };

    await this.storePermission(permission);

    // Log activity
    await this.logActivity({
      id: this.generateId(),
      type: 'permission_granted',
      documentId,
      grantee: granteeDid,
      timestamp: new Date().toISOString(),
      details: `Granted permissions to ${granteeDid}`
    });

    console.log('🔑 Permission granted:', permission);
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