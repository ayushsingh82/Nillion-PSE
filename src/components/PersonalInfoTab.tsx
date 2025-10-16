/**
 * Personal Info Tab Component
 * Manages user's personal information and autofill settings
 */

import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { PersonalInfo, savePersonalInfo, getPersonalInfo, clearPersonalInfo, generateAutofillScript } from '../services/personalInfoService';

interface PersonalInfoTabProps {
  onUpdate?: () => void;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ onUpdate }) => {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    dateOfBirth: '',
    company: '',
    jobTitle: '',
    website: '',
    notes: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPersonalInfo();
  }, []);

  const loadPersonalInfo = async () => {
    try {
      setLoading(true);
      const info = await getPersonalInfo();
      if (info) {
        setPersonalInfo(info);
      }
    } catch (err) {
      setError('Failed to load personal information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await savePersonalInfo(personalInfo);
      setSuccess('Personal information saved successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
      onUpdate?.();
    } catch (err) {
      setError('Failed to save personal information');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all personal information?')) {
      try {
        setLoading(true);
        await clearPersonalInfo();
        setPersonalInfo({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          },
          dateOfBirth: '',
          company: '',
          jobTitle: '',
          website: '',
          notes: ''
        });
        setSuccess('Personal information cleared');
        setTimeout(() => setSuccess(''), 3000);
        onUpdate?.();
      } catch (err) {
        setError('Failed to clear personal information');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAutofill = async () => {
    try {
      // Get current active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const suggestions = {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          street: personalInfo.address.street,
          city: personalInfo.address.city,
          state: personalInfo.address.state,
          zipCode: personalInfo.address.zipCode,
          country: personalInfo.address.country,
          company: personalInfo.company,
          jobTitle: personalInfo.jobTitle,
          website: personalInfo.website,
          dateOfBirth: personalInfo.dateOfBirth
        };
        
        // Use chrome.scripting.executeScript for Manifest V3
        if (browser.scripting) {
          await browser.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (suggestions: Record<string, string>) => {
              console.log('Nillion Autofill: Starting form detection...');
              
              const fieldMappings: Record<string, string[]> = {
                firstName: ['firstname', 'first_name', 'fname', 'given-name'],
                lastName: ['lastname', 'last_name', 'lname', 'family-name', 'surname'],
                email: ['email', 'email_address', 'user_email', 'mail'],
                phone: ['phone', 'telephone', 'mobile', 'phone_number', 'tel'],
                street: ['address', 'street', 'address1', 'street_address'],
                city: ['city', 'locality'],
                state: ['state', 'province', 'region'],
                zipCode: ['zip', 'zipcode', 'postal_code', 'postcode'],
                country: ['country'],
                company: ['company', 'organization', 'employer'],
                jobTitle: ['job_title', 'title', 'position'],
                website: ['website', 'url'],
                dateOfBirth: ['date_of_birth', 'dob', 'birthday']
              };
              
              let filledCount = 0;
              const inputs = document.querySelectorAll('input, textarea, select');
              
              inputs.forEach((input: Element) => {
                const inputElement = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                if (inputElement.type === 'password' || inputElement.type === 'hidden') return;
                
                const attributes = [
                  inputElement.name,
                  inputElement.id,
                  inputElement.getAttribute('data-field'),
                  inputElement.getAttribute('data-name'),
                  (inputElement as HTMLInputElement).placeholder?.toLowerCase(),
                  inputElement.getAttribute('autocomplete')
                ].filter(Boolean);
                
                for (const attr of attributes) {
                  if (!attr) continue;
                  const normalizedAttr = attr.toLowerCase().replace(/[-_\s]/g, '');
                  
                  for (const [field, patterns] of Object.entries(fieldMappings)) {
                    for (const pattern of patterns) {
                      const normalizedPattern = pattern.toLowerCase().replace(/[-_\s]/g, '');
                      
                      if (normalizedAttr.includes(normalizedPattern) || normalizedPattern.includes(normalizedAttr)) {
                        const value = suggestions[field];
                        if (value && !(inputElement as HTMLInputElement).value) {
                          (inputElement as HTMLInputElement).value = value;
                          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                          filledCount++;
                          console.log(`Filled ${attr} with ${value}`);
                          return;
                        }
                      }
                    }
                  }
                }
              });
              
              console.log(`Nillion Autofill: Filled ${filledCount} fields`);
              
              if (filledCount > 0) {
                const notification = document.createElement('div');
                notification.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #4CAF50;
                  color: white;
                  padding: 12px 20px;
                  border-radius: 6px;
                  z-index: 10000;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                notification.textContent = `Nillion: Filled ${filledCount} form fields`;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                  if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                  }
                }, 3000);
              }
            },
            args: [suggestions]
          });
        } else {
          // Fallback for older API
          const script = generateAutofillScript(personalInfo);
          await browser.tabs.executeScript(tabs[0].id, {
            code: script
          });
        }
        
        setSuccess('Autofill executed on current page');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('No active tab found');
      }
    } catch (err) {
      console.error('Autofill error:', err);
      setError('Failed to execute autofill. Make sure you have permission for this page.');
    }
  };

  const updatePersonalInfo = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setPersonalInfo(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setPersonalInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const hasPersonalInfo = personalInfo.firstName || personalInfo.lastName || personalInfo.email;

  if (loading && !isEditing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
        <div className="flex gap-2">
          {hasPersonalInfo && !isEditing && (
            <button
              onClick={handleAutofill}
              className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
              title="Fill forms on current page"
            >
              🔄 Autofill Page
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              ✏️ Edit
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                disabled={loading}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
              >
                💾 Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadPersonalInfo(); // Reset changes
                }}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded text-sm">
          {success}
        </div>
      )}

      {!hasPersonalInfo && !isEditing ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-gray-400 text-4xl mb-4">👤</div>
          <p className="text-gray-600 mb-4">No personal information stored yet</p>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Add Personal Info
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.firstName || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personalInfo.lastName}
                    onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.lastName || '-'}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.email || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.phone || '-'}</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => updatePersonalInfo('dateOfBirth', e.target.value)}
                  className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-800">{personalInfo.dateOfBirth || '-'}</p>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Address</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personalInfo.address.street}
                    onChange={(e) => updatePersonalInfo('address.street', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.address.street || '-'}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={personalInfo.address.city}
                      onChange={(e) => updatePersonalInfo('address.city', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="New York"
                    />
                  ) : (
                    <p className="text-sm text-gray-800">{personalInfo.address.city || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State/Province</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={personalInfo.address.state}
                      onChange={(e) => updatePersonalInfo('address.state', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="NY"
                    />
                  ) : (
                    <p className="text-sm text-gray-800">{personalInfo.address.state || '-'}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ZIP/Postal Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={personalInfo.address.zipCode}
                      onChange={(e) => updatePersonalInfo('address.zipCode', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10001"
                    />
                  ) : (
                    <p className="text-sm text-gray-800">{personalInfo.address.zipCode || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={personalInfo.address.country}
                      onChange={(e) => updatePersonalInfo('address.country', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="United States"
                    />
                  ) : (
                    <p className="text-sm text-gray-800">{personalInfo.address.country || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Professional</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personalInfo.company}
                    onChange={(e) => updatePersonalInfo('company', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Acme Corp"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.company || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={personalInfo.jobTitle}
                    onChange={(e) => updatePersonalInfo('jobTitle', e.target.value)}
                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Software Engineer"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{personalInfo.jobTitle || '-'}</p>
                )}
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              {isEditing ? (
                <input
                  type="url"
                  value={personalInfo.website}
                  onChange={(e) => updatePersonalInfo('website', e.target.value)}
                  className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-sm text-gray-800">{personalInfo.website || '-'}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Notes</h4>
            {isEditing ? (
              <textarea
                value={personalInfo.notes}
                onChange={(e) => updatePersonalInfo('notes', e.target.value)}
                className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                placeholder="Additional notes or information..."
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{personalInfo.notes || '-'}</p>
            )}
          </div>

          {/* Actions */}
          {hasPersonalInfo && !isEditing && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors"
              >
                🗑️ Clear All Data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};