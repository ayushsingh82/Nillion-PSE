/**
 * Secure Storage Service for Nillion Browser Extension
 * Manages DID and keypair storage securely in browser extension storage
 */

import { Keypair } from '@nillion/nuc';
import browser from 'webextension-polyfill';

export interface UserIdentity {
  did: string;
  keypair: {
    publicKey: string;
    privateKey: string;
  };
  createdAt: string;
}

export interface ClusterConfig {
  nodeUrls: string[];
}

const STORAGE_KEYS = {
  IDENTITY: 'nillion_user_identity',
  CLUSTER_URLS: 'nillion_cluster_urls',
};

/**
 * Generate a new DID and keypair for the user
 */
export async function generateIdentity(): Promise<UserIdentity> {
  // Generate new keypair using Nillion SDK
  const keypair = Keypair.generate();
  
  // Get DID from keypair
  const did = keypair.toDid().toString();
  
  // Export keys for storage (format: 'hex')
  const identity: UserIdentity = {
    did,
    keypair: {
      publicKey: keypair.publicKey('hex'),
      privateKey: keypair.privateKey('hex'),
    },
    createdAt: new Date().toISOString(),
  };

  // Store the identity automatically
  await storeIdentity(identity);

  return identity;
}

/**
 * Store the user's identity securely
 */
export async function storeIdentity(identity: UserIdentity): Promise<void> {
  console.log('=== Storing identity ===');
  console.log('Identity to store:', {
    did: identity.did,
    hasKeypair: !!identity.keypair,
    hasPrivateKey: !!identity.keypair?.privateKey,
    storageKey: STORAGE_KEYS.IDENTITY
  });
  
  await browser.storage.local.set({
    [STORAGE_KEYS.IDENTITY]: identity,
  });
  
  // Immediate verification
  const verification = await browser.storage.local.get(STORAGE_KEYS.IDENTITY);
  console.log('Storage verification after save:', {
    saved: STORAGE_KEYS.IDENTITY in verification,
    did: verification[STORAGE_KEYS.IDENTITY]?.did
  });
}

/**
 * Retrieve the user's stored identity
 */
export async function getStoredIdentity(): Promise<UserIdentity | null> {
  console.log('=== Getting stored identity ===');
  console.log('Looking for key:', STORAGE_KEYS.IDENTITY);
  
  const result = await browser.storage.local.get(STORAGE_KEYS.IDENTITY);
  console.log('Storage get result:', {
    hasResult: Object.keys(result).length > 0,
    keys: Object.keys(result),
    hasIdentityKey: STORAGE_KEYS.IDENTITY in result,
    identity: result[STORAGE_KEYS.IDENTITY]
  });
  
  const identity = result[STORAGE_KEYS.IDENTITY] || null;
  console.log('Returning identity:', identity ? identity.did : null);
  
  return identity;
}

/**
 * Reconstruct Keypair from stored private key
 */
export async function getKeypair(): Promise<Keypair | null> {
  const identity = await getStoredIdentity();
  if (!identity) return null;

  try {
    // Use Keypair.from() to reconstruct from hex private key
    return Keypair.from(identity.keypair.privateKey);
  } catch (error) {
    console.error('Failed to reconstruct keypair:', error);
    return null;
  }
}

/**
 * Check if user has been initialized
 */
export async function isInitialized(): Promise<boolean> {
  const identity = await getStoredIdentity();
  return identity !== null;
}

/**
 * Clear all stored identity data (for reset/logout)
 */
export async function clearIdentity(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.IDENTITY);
}

/**
 * Store cluster configuration
 */
export async function setClusterConfig(config: ClusterConfig): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.CLUSTER_URLS]: config.nodeUrls,
  });
}

/**
 * Get stored cluster configuration
 */
export async function getClusterConfig(): Promise<ClusterConfig> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CLUSTER_URLS);
  if (!result[STORAGE_KEYS.CLUSTER_URLS]) {
    // Default testnet configuration
    return {
      nodeUrls: [
        'https://nildb-stg-n1.nillion.network',
        'https://nildb-stg-n2.nillion.network',
        'https://nildb-stg-n3.nillion.network',
      ],
    };
  }

  return {
    nodeUrls: result[STORAGE_KEYS.CLUSTER_URLS],
  };
}

/**
 * Export identity for backup (user-initiated)
 */
export async function exportIdentity(): Promise<string> {
  const identity = await getStoredIdentity();
  if (!identity) {
    throw new Error('No identity to export');
  }

  return JSON.stringify(identity, null, 2);
}

/**
 * Import identity from backup
 */
export async function importIdentity(identityJson: string): Promise<void> {
  const identity: UserIdentity = JSON.parse(identityJson);

  // Validate the imported data
  if (!identity.did || !identity.keypair?.privateKey || !identity.keypair?.publicKey) {
    throw new Error('Invalid identity data');
  }

  // Verify the keypair can be reconstructed
  try {
    const keypair = Keypair.from(identity.keypair.privateKey);
    const did = keypair.toDid().toString();
    if (did !== identity.did) {
      throw new Error('Identity validation failed: DID mismatch');
    }
  } catch (error) {
    throw new Error('Invalid keypair data');
  }

  // Store the imported identity
  await storeIdentity(identity);
}
