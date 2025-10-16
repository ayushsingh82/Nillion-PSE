import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { MessageType } from '../types/index';
import { nillionService, Document, Permission, ActivityLog } from '../services/realNillionService';
import { Keypair } from '@nillion/nuc';
import { authService } from '../services/authService';
import { AuthSetupModal, AuthUnlockModal, QRDisplayModal } from './AuthComponents';
import { PersonalInfoTab } from './PersonalInfoTab';

interface UserIdentity {
  did: string;
  publicKey: string;
  privateKey?: string;
}

export const Dashboard: React.FC = () => {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'permissions' | 'activity' | 'profile'>('overview');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [granteeAddress, setGranteeAddress] = useState('');
  const [selectedDocument, setSelectedDocument] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Authentication states - ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<'passphrase' | 'biometric' | null>(null);
  const [showAuthSetup, setShowAuthSetup] = useState(false);
  const [showAuthUnlock, setShowAuthUnlock] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    console.log('=== Dashboard mounted ===');
    
    // Immediate storage check on mount
    browser.storage.local.get(null).then(storage => {
      console.log('=== Storage on mount ===');
      console.log('All storage keys:', Object.keys(storage));
      console.log('Has identity key:', 'nillion_user_identity' in storage);
      if (storage.nillion_user_identity) {
        console.log('Identity in storage:', {
          did: storage.nillion_user_identity.did,
          hasKeypair: !!storage.nillion_user_identity.keypair
        });
      }
    });
    
    checkAuthAndLoadData();
  }, []);

  // Also reload data when switching tabs if identity exists
  useEffect(() => {
    if (identity?.privateKey && isAuthenticated && !loading) {
      console.log('=== Tab changed or identity available, ensuring data is loaded ===');
      if (activeTab === 'documents' && documents.length === 0) {
        loadDocuments();
      }
      if (activeTab === 'permissions' && permissions.length === 0) {
        loadPermissions();
      }
      if (activeTab === 'activity' && activityLogs.length === 0) {
        loadActivityLogs();
      }
    }
  }, [activeTab, identity, isAuthenticated]);

  const checkAuthAndLoadData = async () => {
    try {
      console.log('=== Checking authentication ===');
      // Check if authentication is enabled
      const authEnabled = await authService.isAuthEnabled();
      console.log('Auth enabled:', authEnabled);
      setIsAuthEnabled(authEnabled);
      
      if (authEnabled) {
        const method = await authService.getAuthMethod();
        console.log('Auth method:', method);
        setAuthMethod(method);
        setLoading(false); // Important: Set loading to false so unlock modal can show
        setShowAuthUnlock(true);
        console.log('Set showAuthUnlock to true');
      } else {
        // No auth enabled, proceed normally
        console.log('No auth enabled, proceeding normally');
        setIsAuthenticated(true);
        await loadInitialData();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setLoading(false); // Ensure loading is false even on error
      setIsAuthenticated(true);
      await loadInitialData();
    }
  };

  const loadInitialData = async () => {
    try {
      console.log('=== Loading initial data ===');
      setLoading(true);
      setError('');

      const initialized = await browser.runtime.sendMessage({
        type: MessageType.IS_INITIALIZED,
      });

      console.log('Initialization status:', initialized);

      if (!initialized) {
        console.log('Extension not initialized, need to create identity');
        setLoading(false);
        return;
      }

      console.log('Extension is initialized, getting stored identity...');
      const identityResponse = await browser.runtime.sendMessage({
        type: MessageType.GET_IDENTITY,
      });

      console.log('Identity response received:', {
        hasResponse: !!identityResponse,
        hasError: !!identityResponse?.error,
        hasDid: !!identityResponse?.did,
        hasPrivateKey: !!identityResponse?.privateKey
      });

      if (identityResponse?.error) {
        console.error('Identity error:', identityResponse.error);
        throw new Error(identityResponse.error);
      }

      if (!identityResponse || !identityResponse.did) {
        console.warn('No valid identity found, need to create new one');
        setLoading(false);
        return;
      }

      console.log('Setting identity from storage:', identityResponse.did);
      setIdentity(identityResponse);

      // Initialize Nillion service with user keypair
      if (identityResponse?.privateKey) {
        console.log('Initializing Nillion service with identity keypair...');
        const keypair = Keypair.from(identityResponse.privateKey);
        await nillionService.initialize(keypair);
        
        // Always load all data after successful initialization
        console.log('Loading all data after initialization...');
        await Promise.all([
          loadDocuments(),
          loadPermissions(),
          loadActivityLogs()
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Load data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      console.log('=== Starting loadDocuments ===');
      if (!identity?.privateKey) {
        console.log('No private key available for loading documents');
        return;
      }

      // Ensure Nillion service is initialized
      if (!nillionService.isServiceReady()) {
        console.log('Initializing Nillion service for document loading...');
        const keypair = Keypair.from(identity.privateKey);
        await nillionService.initialize(keypair);
      }

      console.log('Fetching documents from service...');
      const userDocuments = await nillionService.listDocuments();
      console.log('Raw documents from service:', userDocuments);
      
      setDocuments(userDocuments || []);
      setDocumentCount((userDocuments || []).length);
      console.log('📚 Loaded', (userDocuments || []).length, 'documents');
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
      setDocumentCount(0);
    }
  };

  const loadPermissions = async () => {
    try {
      if (!identity?.privateKey) {
        console.log('No private key available for loading permissions');
        return;
      }

      // Ensure Nillion service is initialized
      if (!nillionService.isServiceReady()) {
        console.log('Initializing Nillion service for permission loading...');
        const keypair = Keypair.from(identity.privateKey);
        await nillionService.initialize(keypair);
      }

      const userPermissions = await nillionService.listPermissions();
      setPermissions(userPermissions);
      console.log('🔐 Loaded', userPermissions.length, 'permissions');
    } catch (err) {
      console.error('Failed to load permissions:', err);
    }
  };

  const loadActivityLogs = async () => {
    try {
      if (!identity?.privateKey) {
        console.log('No private key available for loading activity logs');
        return;
      }

      // Ensure Nillion service is initialized
      if (!nillionService.isServiceReady()) {
        console.log('Initializing Nillion service for activity loading...');
        const keypair = Keypair.from(identity.privateKey);
        await nillionService.initialize(keypair);
      }

      const logs = await nillionService.getActivityLogs();
      setActivityLogs(logs || []); // Ensure we always set an array
      console.log('📊 Loaded', (logs || []).length, 'activity logs');
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setActivityLogs([]); // Set empty array on error to prevent crashes
    }
  };

  const handleGenerateIdentity = async () => {
    try {
      console.log('=== Generate identity button clicked ===');
      setLoading(true);
      setError('');

      const response = await browser.runtime.sendMessage({
        type: MessageType.GENERATE_IDENTITY,
      });

      console.log('Generate identity response:', response);

      if (response?.error) {
        throw new Error(response.error);
      }

      setIdentity(response);

      // Verify storage immediately after generation
      console.log('=== Verifying identity was saved ===');
      const storageCheck = await browser.storage.local.get('nillion_user_identity');
      console.log('Storage verification:', {
        keyExists: 'nillion_user_identity' in storageCheck,
        did: storageCheck.nillion_user_identity?.did,
        hasKeypair: !!storageCheck.nillion_user_identity?.keypair
      });

      // Also test if background script can retrieve it
      setTimeout(async () => {
        try {
          console.log('=== Testing identity retrieval after 1 second ===');
          const testResponse = await browser.runtime.sendMessage({
            type: MessageType.GET_IDENTITY,
          });
          console.log('Identity retrieval test:', {
            success: !!testResponse,
            did: testResponse?.did,
            matches: testResponse?.did === response?.did
          });
        } catch (err) {
          console.error('Identity retrieval test failed:', err);
        }
      }, 1000);

      // Initialize Nillion service with new identity
      if (response?.privateKey) {
        console.log('Initializing Nillion service with new identity...');
        const keypair = Keypair.from(response.privateKey);
        await nillionService.initialize(keypair);
        
        // Load all data for new identity
        await Promise.all([
          loadDocuments(),
          loadPermissions(),
          loadActivityLogs()
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Generate identity error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate identity');
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      console.log('Reset button clicked');
      await browser.storage.local.clear();
      setIdentity(null);
      setError('');
    } catch (err) {
      console.error('Reset error:', err);
      setError('Failed to reset identity');
    }
  };

  const handleAddDocument = () => {
    console.log('=== Add document button clicked ===');
    console.log('Current showAddDoc state:', showAddDoc);
    console.log('Current activeTab:', activeTab);
    setShowAddDoc(true);
    console.log('Set showAddDoc to true');
    // Switch to overview tab to show the form if not already there
    if (activeTab !== 'overview') {
      setActiveTab('overview');
    }
  };

  const handleCreateDocument = async () => {
    try {
      console.log('=== Creating document ===');
      console.log('Document title:', documentTitle);
      console.log('Document content:', documentContent);
      console.log('Identity available:', !!identity);
      console.log('Private key available:', !!identity?.privateKey);
      
      if (!documentTitle.trim()) {
        console.log('Error: No title provided');
        setError('Please enter a document title');
        return;
      }

      if (!identity) {
        setError('No identity available. Please create an identity first.');
        return;
      }

      if (!identity.privateKey) {
        setError('Identity private key not available. Please restart the extension.');
        return;
      }

      setLoading(true);
      setError('');

      // Ensure Nillion service is initialized
      if (!nillionService.isServiceReady()) {
        console.log('Initializing Nillion service...');
        const keypair = Keypair.from(identity.privateKey);
        await nillionService.initialize(keypair);
      }

      // Create document using Nillion service
      const newDocument = await nillionService.createDocument(
        documentTitle.trim(),
        documentContent.trim()
      );

      console.log('✅ Document created:', newDocument);

      // Reset form
      setDocumentTitle('');
      setDocumentContent('');
      setShowAddDoc(false);
      
      // Reload documents
      await loadDocuments();
      await loadActivityLogs();
      
      setLoading(false);
      console.log('=== Document creation successful ===');
      
    } catch (err) {
      console.error('Create document error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      if (!identity?.privateKey) {
        setError('Identity not available');
        return;
      }

      setLoading(true);
      setError('');

      // Ensure Nillion service is initialized
      if (!nillionService.isServiceReady()) {
        const keypair = Keypair.from(identity.privateKey);
        await nillionService.initialize(keypair);
      }

      await nillionService.deleteDocument(documentId);
      await loadDocuments();
      await loadActivityLogs();
      setLoading(false);
    } catch (err) {
      console.error('Delete document error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      setLoading(false);
    }
  };

  const handleCancelAdd = () => {
    console.log('=== Cancel button clicked ===');
    setShowAddDoc(false);
    setDocumentTitle('');
    setDocumentContent('');
    setError('');
    console.log('Form reset and hidden');
  };

  const handleAuthSetup = async (method: 'passphrase' | 'biometric', passphrase?: string) => {
    try {
      console.log('=== Setting up auth ===');
      console.log('Method:', method);
      await authService.setupAuth(method, passphrase);
      console.log('Auth setup successful');
      setIsAuthEnabled(true);
      setAuthMethod(method);
      setIsAuthenticated(true);
      setShowAuthSetup(false);
      await loadInitialData();
    } catch (error) {
      console.error('Auth setup failed:', error);
      throw error;
    }
  };

  const handleAuthUnlock = async (passphrase?: string): Promise<boolean> => {
    try {
      console.log('=== Attempting to unlock ===');
      console.log('Auth method:', authMethod);
      console.log('Passphrase provided:', !!passphrase);
      
      let success = false;
      
      if (authMethod === 'passphrase' && passphrase) {
        console.log('Verifying passphrase...');
        success = await authService.verifyPassphrase(passphrase);
        console.log('Passphrase verification result:', success);
      } else if (authMethod === 'biometric') {
        console.log('Attempting biometric authentication...');
        success = await authService.authenticateBiometric();
        console.log('Biometric authentication result:', success);
      }
      
      if (success) {
        console.log('Authentication successful, loading data...');
        setIsAuthenticated(true);
        setShowAuthUnlock(false);
        await loadInitialData();
      } else {
        console.log('Authentication failed');
      }
      
      return success;
    } catch (error) {
      console.error('Auth unlock failed:', error);
      return false;
    }
  };

  const handleCopyDID = async () => {
    try {
      await navigator.clipboard.writeText(identity?.did || '');
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy DID:', err);
      setError('Failed to copy DID to clipboard');
    }
  };

  // Authentication check - show unlock screen if auth is enabled but not authenticated
  if (isAuthEnabled && !isAuthenticated && !showAuthUnlock) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
          <button 
            onClick={() => {
              console.log('Bypassing auth for testing...');
              setIsAuthenticated(true);
              setIsAuthEnabled(false);
              loadInitialData();
            }}
            className="mt-4 text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
          >
            Skip Auth (Debug)
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-blue-50 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Nillion</h2>
          <p className="text-gray-600 mb-6">Create your secure identity</p>
          <button
            onClick={handleGenerateIdentity}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Create Identity
          </button>
          {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[600px] bg-white flex flex-col">
      <div className="bg-blue-600 p-4 text-white">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-bold">Nillion Storage</h1>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowQRModal(true)}
              className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
              title="Show QR Code"
            >
              QR
            </button>
            <button
              onClick={async () => {
                const storage = await browser.storage.local.get(null);
                console.log('=== FULL STORAGE DEBUG ===');
                console.log('All storage keys:', Object.keys(storage));
                console.log('Storage contents:', storage);
                console.log('Identity key exists:', 'nillion_user_identity' in storage);
                console.log('Auth keys:', Object.keys(storage).filter(k => k.includes('auth')));
              }}
              className="text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded"
              title="Debug Storage"
            >
              🐛
            </button>
            <button
              onClick={() => {
                console.log('Security button clicked');
                console.log('Current showAuthSetup state:', showAuthSetup);
                setShowAuthSetup(true);
                console.log('Set showAuthSetup to true');
              }}
              className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
              title="Security Settings"
            >
              🔒
            </button>
            <button
              onClick={handleReset}
              className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="bg-blue-700 rounded p-3">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs">Your DID</p>
            <button
              onClick={handleCopyDID}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                copySuccess 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title="Copy DID to clipboard"
            >
              {copySuccess ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="bg-blue-800 rounded p-2 break-all">
            <code className="text-xs leading-relaxed">{identity.did}</code>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'documents', label: 'Documents' },
            { key: 'permissions', label: 'Permissions' },
            { key: 'activity', label: 'Activity' },
            { key: 'profile', label: 'Profile' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'documents' | 'permissions' | 'activity' | 'profile')}
              className={`flex-1 py-2 px-3 text-xs font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {showAddDoc ? (
              <div className="bg-white border rounded p-4">
                <h3 className="font-semibold mb-4">Create New Document</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content (Optional)
                    </label>
                    <textarea
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                      placeholder="Enter document content..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateDocument}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Document'}
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-semibold mb-2">Identity Status</h3>
                  <p className="text-sm text-green-600">✅ Active</p>
                  {/* Debug Info */}
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Auth Enabled: {isAuthEnabled ? 'Yes' : 'No'}</p>
                    <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
                    <p>Method: {authMethod || 'None'}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Documents</h3>
                    {documentCount === 0 && identity?.privateKey && (
                      <button 
                        onClick={loadDocuments}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{documentCount}</p>
                  <p className="text-xs text-gray-600">
                    {documentCount === 0 ? 'No documents yet' : `${documentCount} document${documentCount !== 1 ? 's' : ''} stored`}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button 
                      onClick={handleAddDocument}
                      className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      Add Document
                    </button>
                    {isAuthEnabled && (
                      <button 
                        onClick={async () => {
                          console.log('Disabling auth...');
                          await authService.disableAuth();
                          setIsAuthEnabled(false);
                          setAuthMethod(null);
                          console.log('Auth disabled');
                        }}
                        className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                        title="Disable Authentication"
                      >
                        Disable Lock
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-semibold mb-2">Getting Started</h3>
                  <p className="text-sm text-gray-600 mb-2">Your identity is ready! You can now:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Store private documents</li>
                    <li>• Manage app permissions</li>
                    <li>• Control data access</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            {showAddDoc ? (
              <div className="bg-white border rounded p-4">
                <h3 className="font-semibold mb-4">Create New Document</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content (Optional)
                    </label>
                    <textarea
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                      placeholder="Enter document content..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateDocument}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Document'}
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Your Documents</h3>
                  <button 
                    onClick={handleAddDocument}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Add Document
                  </button>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No documents yet</p>
                    <p className="text-xs">Create your first document to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{doc.title}</h4>
                            <p className="text-xs text-gray-500">
                              Created {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                            {doc.content && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {doc.content.substring(0, 50)}...
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-xs text-red-600 hover:text-red-800 ml-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Document Permissions</h3>
            
            {/* Grant Permission Form */}
            <div className="border rounded p-4 bg-gray-50">
              <h4 className="font-medium text-sm mb-3">Grant Access</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Document
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a document...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Grantee DID/Address
                  </label>
                  <input
                    type="text"
                    value={granteeAddress}
                    onChange={(e) => setGranteeAddress(e.target.value)}
                    placeholder="Enter DID or address..."
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={async () => {
                    if (!selectedDocument || !granteeAddress.trim()) {
                      setError('Please select a document and enter a grantee address');
                      return;
                    }
                    
                    try {
                      setLoading(true);
                      await nillionService.grantPermission(selectedDocument, granteeAddress.trim(), { read: true, write: false, execute: false });
                      
                      // Load updated permissions
                      const updatedPermissions = await nillionService.listPermissions();
                      setPermissions(updatedPermissions);
                      
                      // Load updated activity logs
                      await loadActivityLogs();
                      
                      // Reset form
                      setSelectedDocument('');
                      setGranteeAddress('');
                      setLoading(false);
                    } catch (err) {
                      console.error('Grant permission error:', err);
                      setError(err instanceof Error ? err.message : 'Failed to grant permission');
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !selectedDocument || !granteeAddress.trim()}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Granting...' : 'Grant Permission'}
                </button>
              </div>
            </div>

            {/* Permissions List */}
            <div>
              <h4 className="font-medium text-sm mb-3">Active Permissions</h4>
              {permissions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-xs">No permissions granted yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div key={`${permission.documentId}-${permission.grantee}`} className="border rounded p-3 bg-white">
                      <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-xs">Document: {permission.documentId}</p>
                        <p className="text-xs text-gray-500">Granted to: {permission.grantee.slice(0, 20)}...</p>
                        <p className="text-xs text-gray-400">
                          Permissions: {[
                            permission.read && 'Read',
                            permission.write && 'Write', 
                            permission.execute && 'Execute'
                          ].filter(Boolean).join(', ') || 'None'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(permission.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                        <button
                          onClick={async () => {
                            try {
                              setLoading(true);
                              await nillionService.revokePermission(permission.documentId, permission.grantee);
                              
                              // Reload permissions
                              const updatedPermissions = await nillionService.listPermissions();
                              setPermissions(updatedPermissions);
                              
                              // Load updated activity logs
                              await loadActivityLogs();
                              setLoading(false);
                            } catch (err) {
                              console.error('Revoke permission error:', err);
                              setError(err instanceof Error ? err.message : 'Failed to revoke permission');
                              setLoading(false);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Activity Log</h3>
            
            {!activityLogs || activityLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No activity yet</p>
                <p className="text-xs">Your document and permission activities will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => {
                  // Safe guard against malformed log entries
                  if (!log || !log.id || !log.type) {
                    return null;
                  }
                  
                  return (
                    <div key={String(log.id)} className="border rounded p-3 bg-white">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          log.type === 'document_created' ? 'bg-green-500' :
                          log.type === 'document_deleted' ? 'bg-red-500' :
                          log.type === 'permission_granted' ? 'bg-blue-500' :
                          log.type === 'permission_revoked' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {log.type === 'document_created' && 'Document Created'}
                            {log.type === 'document_deleted' && 'Document Deleted'}
                            {log.type === 'permission_granted' && 'Permission Granted'}
                            {log.type === 'permission_revoked' && 'Permission Revoked'}
                            {log.type === 'document_accessed' && 'Document Accessed'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {typeof log.details === 'string' ? log.details : 'No details available'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <PersonalInfoTab />
        )}
      </div>

      {/* Authentication Modals */}
      <AuthSetupModal
        isOpen={showAuthSetup}
        onClose={() => setShowAuthSetup(false)}
        onSetup={handleAuthSetup}
      />

      <AuthUnlockModal
        isOpen={showAuthUnlock}
        method={authMethod || 'passphrase'}
        onUnlock={handleAuthUnlock}
        onCancel={() => {
          setShowAuthUnlock(false);
          setIsAuthenticated(true);
          loadInitialData();
        }}
      />

      <QRDisplayModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        did={identity?.did || ''}
      />
    </div>
  );
};
