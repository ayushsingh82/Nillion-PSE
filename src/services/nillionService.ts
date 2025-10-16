import { 
  Keypair, 
  PayerBuilder, 
  NucTokenBuilder,
  Command 
} from '@nillion/nuc';
import { 
  SecretVaultBuilderClient, 
  SecretVaultUserClient 
} from '@nillion/secretvaults';

// Browser-compatible UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface NillionDocument {
  _id: string;
  title: string;
  content?: string | { '%allot': string };
  owner: string;
  createdAt: string;
  collection: string;
  [key: string]: unknown;
}

export interface NillionConfig {
  NILCHAIN_URL: string;
  NILAUTH_URL: string;
  NILDB_NODES: string[];
  BUILDER_PRIVATE_KEY: string;
}

export class NillionService {
  private config: NillionConfig;
  private builderKeypair: Keypair;
  private builderClient: SecretVaultBuilderClient | null = null;
  private payer: any | null = null;
  private collectionId: string | null = null;
  private isInitialized = false;

  constructor() {
    // Default testnet configuration
    this.config = {
      NILCHAIN_URL: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
      NILAUTH_URL: 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
      NILDB_NODES: [
        'https://nildb-stg-n1.nillion.network',
        'https://nildb-stg-n2.nillion.network',
        'https://nildb-stg-n3.nillion.network'
      ],
      BUILDER_PRIVATE_KEY: '036a5426fed34f6681f9730dbaa70d77ab9f2b6f7fcfff0b5fb7c88e2a09cf4a05'
    };

    this.builderKeypair = Keypair.from(this.config.BUILDER_PRIVATE_KEY);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing Nillion service...');
      
      // Create payer and nilauth client
      this.payer = await new PayerBuilder()
        .keypair(this.builderKeypair)
        .chainUrl(this.config.NILCHAIN_URL)
        .build();

      // Create builder client
      this.builderClient = await SecretVaultBuilderClient.from({
        keypair: this.builderKeypair,
        urls: {
          chain: this.config.NILCHAIN_URL,
          auth: this.config.NILAUTH_URL,
          dbs: this.config.NILDB_NODES,
        }
      });

      // Refresh token using existing subscription
      await this.builderClient.refreshRootToken();
      console.log('✅ Token refreshed');

      // Register builder if needed
      await this.registerBuilder();

      // Create collection if needed
      await this.ensureDocumentCollection();

      this.isInitialized = true;
      console.log('✅ Nillion service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Nillion service:', error);
      throw error;
    }
  }

  private async registerBuilder(): Promise<void> {
    if (!this.builderClient) {
      throw new Error('Builder client not initialized');
    }

    try {
      const existingProfile = await this.builderClient.readProfile();
      console.log('✅ Builder already registered:', existingProfile.data.name);
    } catch (profileError) {
      try {
        const builderDid = this.builderKeypair.toDid().toString();
        await this.builderClient.register({
          did: builderDid as any,
          name: 'Nillion Browser Extension'
        });
        console.log('✅ Builder registered successfully');
      } catch (registerError: any) {
        if (registerError.message.includes('duplicate key')) {
          console.log('✅ Builder already registered (duplicate key)');
        } else {
          throw registerError;
        }
      }
    }
  }

  private async ensureDocumentCollection(): Promise<void> {
    if (!this.builderClient) {
      throw new Error('Builder client not initialized');
    }

    if (this.collectionId) {
      return;
    }

    // Generate a deterministic collection ID for this extension
    this.collectionId = 'browser-extension-documents-v1';

    const collection = {
      _id: this.collectionId,
      type: 'owned' as const,
      name: 'Browser Extension Documents',
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'array',
        uniqueItems: true,
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            content: { 
              type: "object",
              properties: {
                "%share": {
                  type: "string"
                }
              },
              required: ["%share"]
            },
            owner: { type: 'string' },
            createdAt: { type: 'string' },
            collection: { type: 'string' }
          },
          required: ['_id', 'title', 'owner', 'createdAt', 'collection']
        }
      }
    };

    try {
      const createResults = await this.builderClient.createCollection(collection);
      console.log('✅ Document collection created on', Object.keys(createResults).length, 'nodes');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('✅ Document collection already exists');
      } else {
        console.error('❌ Collection creation failed:', error.message);
        // Don't throw here - collection might exist but we can't verify due to testnet issues
      }
    }
  }

  async createDocument(userKeypair: Keypair, title: string, content = ''): Promise<NillionDocument> {
    await this.initialize();
    
    if (!this.builderClient || !this.collectionId) {
      throw new Error('Nillion service not properly initialized');
    }

    console.log('📝 Creating document:', { title, content: content.substring(0, 50) + '...' });

    const userDid = userKeypair.toDid().toString();
    const builderDid = this.builderKeypair.toDid().toString();
    const documentId = generateUUID();

    // Create user client
    const userClient = await SecretVaultUserClient.from({
      baseUrls: this.config.NILDB_NODES,
      keypair: userKeypair,
      blindfold: {
        operation: 'store'
      }
    });

    // Create delegation token
    const delegation = NucTokenBuilder.extending(this.builderClient.rootToken)
      .command(new Command(['nil', 'db', 'data', 'create']))
      .audience(userKeypair.toDid())
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(this.builderKeypair.privateKey());

    // Document data
    const documentData: NillionDocument = {
      _id: documentId,
      title,
      content: content ? { '%allot': content } : undefined,
      owner: userDid,
      createdAt: new Date().toISOString(),
      collection: this.collectionId
    };

    // Create the document with user ownership and builder access
    const uploadResults = await userClient.createData(delegation, {
      owner: userDid,
      acl: {
        grantee: builderDid,
        read: true,
        write: false,
        execute: true
      },
      collection: this.collectionId,
      data: [documentData]
    });

    console.log('✅ Document created successfully:', documentId);
    return documentData;
  }

  async listUserDocuments(userKeypair: Keypair): Promise<NillionDocument[]> {
    await this.initialize();

    if (!this.config.NILDB_NODES.length) {
      return [];
    }

    try {
      // Create user client
      const userClient = await SecretVaultUserClient.from({
        baseUrls: this.config.NILDB_NODES,
        keypair: userKeypair,
        blindfold: {
          operation: 'store'
        }
      });

      // List user's data references
      const references = await userClient.listDataReferences();
      console.log('📚 Found', references.data.length, 'user documents');

      const documents: NillionDocument[] = [];
      
      // Fetch details for each document
      for (const ref of references.data) {
        if (ref.collection === this.collectionId) {
          try {
            const docData = await userClient.readData({
              collection: ref.collection,
              document: ref.document
            });
            documents.push(docData.data as NillionDocument);
          } catch (error) {
            console.warn('Could not read document:', ref.document, error);
          }
        }
      }

      return documents;
    } catch (error) {
      console.error('❌ Failed to list user documents:', error);
      return [];
    }
  }

  async deleteDocument(userKeypair: Keypair, documentId: string): Promise<void> {
    await this.initialize();

    if (!this.collectionId) {
      throw new Error('Collection not initialized');
    }

    // Create user client
    const userClient = await SecretVaultUserClient.from({
      baseUrls: this.config.NILDB_NODES,
      keypair: userKeypair,
      blindfold: {
        operation: 'store'
      }
    });

    await userClient.deleteData({
      collection: this.collectionId,
      document: documentId
    });

    console.log('🗑️ Document deleted:', documentId);
  }

  async grantDocumentAccess(
    userKeypair: Keypair, 
    documentId: string, 
    granteeDid: string, 
    permissions: { read?: boolean; write?: boolean; execute?: boolean }
  ): Promise<void> {
    await this.initialize();

    if (!this.collectionId) {
      throw new Error('Collection not initialized');
    }

    const userClient = await SecretVaultUserClient.from({
      baseUrls: this.config.NILDB_NODES,
      keypair: userKeypair,
      blindfold: {
        operation: 'store'
      }
    });

    await userClient.grantAccess({
      collection: this.collectionId,
      document: documentId,
      acl: {
        grantee: granteeDid,
        read: permissions.read || false,
        write: permissions.write || false,
        execute: permissions.execute || false
      }
    });

    console.log('🔑 Access granted to', granteeDid, 'for document', documentId);
  }

  async revokeDocumentAccess(userKeypair: Keypair, documentId: string, granteeDid: string): Promise<void> {
    await this.initialize();

    if (!this.collectionId) {
      throw new Error('Collection not initialized');
    }

    const userClient = await SecretVaultUserClient.from({
      baseUrls: this.config.NILDB_NODES,
      keypair: userKeypair,
      blindfold: {
        operation: 'store'
      }
    });

    await userClient.revokeAccess({
      grantee: granteeDid,
      collection: this.collectionId,
      document: documentId
    });

    console.log('🚫 Access revoked from', granteeDid, 'for document', documentId);
  }

  getBuilderDid(): string {
    return this.builderKeypair.toDid().toString();
  }

  isServiceReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const nillionService = new NillionService();