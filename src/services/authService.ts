import browser from 'webextension-polyfill';

export interface AuthConfig {
  isEnabled: boolean;
  method: 'passphrase' | 'biometric';
  hashedPassphrase?: string;
}

export class AuthService {
  private static instance: AuthService;
  private saltKey = 'nillion_auth_salt';
  private configKey = 'nillion_auth_config';

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Generate a random salt for password hashing
  private async generateSalt(): Promise<string> {
    try {
      const array = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
      } else {
        // Fallback for environments without crypto.getRandomValues
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating salt:', error);
      // Fallback salt generation
      return Date.now().toString(16) + Math.random().toString(16).slice(2);
    }
  }

  // Hash passphrase with salt
  private async hashPassphrase(passphrase: string, salt: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase + salt);
      
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback simple hash (not as secure but functional)
        let hash = 0;
        const str = passphrase + salt;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
      }
    } catch (error) {
      console.error('Error hashing passphrase:', error);
      throw new Error('Failed to hash passphrase');
    }
  }

  // Setup authentication
  async setupAuth(method: 'passphrase' | 'biometric', passphrase?: string): Promise<void> {
    try {
      console.log('=== Setting up authentication ===');
      console.log('Method:', method);
      console.log('Passphrase provided:', !!passphrase);
      
      const config: AuthConfig = {
        isEnabled: true,
        method
      };

      if (method === 'passphrase' && passphrase) {
        console.log('Setting up passphrase authentication...');
        // Generate salt and hash passphrase
        const salt = await this.generateSalt();
        console.log('Generated salt');
        const hashedPassphrase = await this.hashPassphrase(passphrase, salt);
        console.log('Hashed passphrase');
        
        const passphraseConfig: AuthConfig = {
          ...config,
          hashedPassphrase
        };
        
        // Store salt separately
        await browser.storage.local.set({ [this.saltKey]: salt });
        console.log('Stored salt');
        await browser.storage.local.set({ [this.configKey]: passphraseConfig });
        console.log('Stored passphrase config');
      } else {
        console.log('Setting up biometric authentication...');
        await browser.storage.local.set({ [this.configKey]: config });
        console.log('Stored biometric config');
      }
      
      console.log('Authentication setup complete');
    } catch (error) {
      console.error('Error setting up authentication:', error);
      throw error;
    }
  }

  // Check if auth is enabled
  async isAuthEnabled(): Promise<boolean> {
    try {
      console.log('=== Checking if auth is enabled ===');
      const result = await browser.storage.local.get(this.configKey);
      console.log('Auth config from storage:', result);
      const config: AuthConfig = result[this.configKey];
      const enabled = config?.isEnabled || false;
      console.log('Auth enabled result:', enabled);
      return enabled;
    } catch (error) {
      console.error('Error checking if auth is enabled:', error);
      return false;
    }
  }

  // Get auth method
  async getAuthMethod(): Promise<'passphrase' | 'biometric' | null> {
    try {
      console.log('=== Getting auth method ===');
      const result = await browser.storage.local.get(this.configKey);
      const config: AuthConfig = result[this.configKey];
      const method = config?.method || null;
      console.log('Auth method:', method);
      return method;
    } catch (error) {
      console.error('Error getting auth method:', error);
      return null;
    }
  }

  // Verify passphrase
  async verifyPassphrase(passphrase: string): Promise<boolean> {
    try {
      const [configResult, saltResult] = await Promise.all([
        browser.storage.local.get(this.configKey),
        browser.storage.local.get(this.saltKey)
      ]);

      const config: AuthConfig = configResult[this.configKey];
      const salt: string = saltResult[this.saltKey];

      if (!config?.hashedPassphrase || !salt) {
        return false;
      }

      const hashedInput = await this.hashPassphrase(passphrase, salt);
      return hashedInput === config.hashedPassphrase;
    } catch (error) {
      console.error('Error verifying passphrase:', error);
      return false;
    }
  }

  // Check biometric support (simplified - would need native messaging in real implementation)
  async isBiometricSupported(): Promise<boolean> {
    // In a real implementation, this would check for native biometric capabilities
    // For now, we'll simulate biometric support based on browser capabilities
    return 'credentials' in navigator && 'create' in navigator.credentials;
  }

  // Simulate biometric authentication
  async authenticateBiometric(): Promise<boolean> {
    try {
      // In a real implementation, this would use WebAuthn or native messaging
      // For demo purposes, we'll show a confirmation dialog
      return confirm('Biometric authentication: Touch your fingerprint sensor or use Face ID');
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  // Disable authentication
  async disableAuth(): Promise<void> {
    console.log('Disabling authentication...');
    try {
      await browser.storage.local.remove([
        'nillion_auth_enabled',
        'nillion_auth_method', 
        'nillion_auth_hash',
        'nillion_auth_salt'
      ]);
      console.log('Auth disabled successfully');
    } catch (error) {
      console.error('Error disabling auth:', error);
    }
  }

  // Change passphrase
  async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<boolean> {
    // Verify old passphrase first
    const isValid = await this.verifyPassphrase(oldPassphrase);
    if (!isValid) {
      return false;
    }

    // Set new passphrase
    await this.setupAuth('passphrase', newPassphrase);
    return true;
  }
}

export const authService = AuthService.getInstance();