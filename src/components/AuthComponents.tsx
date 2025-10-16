import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { authService } from '../services/authService';

interface AuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: (method: 'passphrase' | 'biometric', passphrase?: string) => Promise<void>;
}

export const AuthSetupModal: React.FC<AuthSetupModalProps> = ({ isOpen, onClose, onSetup }) => {
  const [method, setMethod] = useState<'passphrase' | 'biometric'>('passphrase');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const supported = await authService.isBiometricSupported();
    setBiometricSupported(supported);
  };

  const handleSetup = async () => {
    setError('');
    setLoading(true);

    try {
      if (method === 'passphrase') {
        if (!passphrase.trim()) {
          setError('Please enter a passphrase');
          setLoading(false);
          return;
        }
        if (passphrase !== confirmPassphrase) {
          setError('Passphrases do not match');
          setLoading(false);
          return;
        }
        if (passphrase.length < 6) {
          setError('Passphrase must be at least 6 characters');
          setLoading(false);
          return;
        }
      }

      await onSetup(method, method === 'passphrase' ? passphrase : undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-sm">
        <h3 className="text-lg font-bold mb-4">Setup Security</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Authentication Method</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="passphrase"
                  checked={method === 'passphrase'}
                  onChange={(e) => setMethod(e.target.value as 'passphrase')}
                  className="mr-2"
                />
                Passphrase
              </label>
              {biometricSupported && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="biometric"
                    checked={method === 'biometric'}
                    onChange={(e) => setMethod(e.target.value as 'biometric')}
                    className="mr-2"
                  />
                  Biometric (Fingerprint/Face ID)
                </label>
              )}
            </div>
          </div>

          {method === 'passphrase' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Passphrase</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Enter passphrase (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Passphrase</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Confirm passphrase"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSetup}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Setup'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AuthUnlockModalProps {
  isOpen: boolean;
  method: 'passphrase' | 'biometric';
  onUnlock: (passphrase?: string) => Promise<boolean>;
  onCancel: () => void;
}

export const AuthUnlockModal: React.FC<AuthUnlockModalProps> = ({ isOpen, method, onUnlock, onCancel }) => {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      let success = false;
      
      if (method === 'passphrase') {
        success = await onUnlock(passphrase);
        if (!success) {
          setError('Invalid passphrase');
        }
      } else {
        success = await onUnlock();
        if (!success) {
          setError('Biometric authentication failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
    setLoading(false);
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    const success = await authService.authenticateBiometric();
    if (success) {
      await onUnlock();
    } else {
      setError('Biometric authentication failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && method === 'biometric') {
      handleBiometricAuth();
    }
  }, [isOpen, method]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-sm">
        <h3 className="text-lg font-bold mb-4">Unlock Nillion</h3>
        
        <div className="space-y-4">
          {method === 'passphrase' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Enter Passphrase</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Enter your passphrase"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleUnlock}
                  disabled={loading || !passphrase.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Unlocking...' : 'Unlock'}
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl mb-2">🔒</div>
                <p className="text-sm text-gray-600">
                  {loading ? 'Authenticating...' : 'Biometric authentication required'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleBiometricAuth}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Try Again'}
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface QRDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  did: string;
}

export const QRDisplayModal: React.FC<QRDisplayModalProps> = ({ isOpen, onClose, did }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && did) {
      generateQRCode();
    }
  }, [isOpen, did]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const url = await QRCode.toDataURL(did, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
    setLoading(false);
  };

  const copyDID = async () => {
    try {
      await navigator.clipboard.writeText(did);
    } catch (error) {
      console.error('Failed to copy DID:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Your DID</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="text-center">
            {loading ? (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mx-auto rounded">
                <div className="text-gray-500">Generating QR...</div>
              </div>
            ) : qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="DID QR Code" 
                className="mx-auto rounded border"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center mx-auto rounded">
                <div className="text-gray-500">QR Code Error</div>
              </div>
            )}
          </div>

          {/* Text Display */}
          <div>
            <label className="block text-sm font-medium mb-2">DID (Text)</label>
            <div className="bg-gray-50 p-3 rounded border">
              <code className="text-xs break-all">{did}</code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyDID}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Copy DID
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Share this QR code or DID text with apps that need to connect to your Nillion identity
          </div>
        </div>
      </div>
    </div>
  );
};