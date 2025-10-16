/**
 * Personal Information Service
 * Manages user's personal data for autofill and form completion
 */

import browser from 'webextension-polyfill';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  dateOfBirth: string;
  company: string;
  jobTitle: string;
  website: string;
  notes: string;
}

const STORAGE_KEY = 'nillion_personal_info';

/**
 * Save personal information
 */
export async function savePersonalInfo(info: PersonalInfo): Promise<void> {
  try {
    console.log('Saving personal info...');
    await browser.storage.local.set({
      [STORAGE_KEY]: info
    });
    console.log('Personal info saved successfully');
  } catch (error) {
    console.error('Failed to save personal info:', error);
    throw error;
  }
}

/**
 * Get stored personal information
 */
export async function getPersonalInfo(): Promise<PersonalInfo | null> {
  try {
    console.log('Loading personal info...');
    const result = await browser.storage.local.get(STORAGE_KEY);
    const info = result[STORAGE_KEY] || null;
    console.log('Personal info loaded:', !!info);
    return info;
  } catch (error) {
    console.error('Failed to load personal info:', error);
    return null;
  }
}

/**
 * Clear personal information
 */
export async function clearPersonalInfo(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
    console.log('Personal info cleared');
  } catch (error) {
    console.error('Failed to clear personal info:', error);
    throw error;
  }
}

/**
 * Get autofill suggestions for common form fields
 */
export function getAutofillSuggestions(info: PersonalInfo): Record<string, string> {
  return {
    // Name fields
    'firstName': info.firstName,
    'first_name': info.firstName,
    'fname': info.firstName,
    'given-name': info.firstName,
    'lastName': info.lastName,
    'last_name': info.lastName,
    'lname': info.lastName,
    'family-name': info.lastName,
    'fullName': `${info.firstName} ${info.lastName}`.trim(),
    'full_name': `${info.firstName} ${info.lastName}`.trim(),
    'name': `${info.firstName} ${info.lastName}`.trim(),
    
    // Contact fields
    'email': info.email,
    'email_address': info.email,
    'user_email': info.email,
    'phone': info.phone,
    'telephone': info.phone,
    'mobile': info.phone,
    'phone_number': info.phone,
    
    // Address fields
    'address': info.address.street,
    'street': info.address.street,
    'address1': info.address.street,
    'street_address': info.address.street,
    'city': info.address.city,
    'state': info.address.state,
    'province': info.address.state,
    'region': info.address.state,
    'zip': info.address.zipCode,
    'zipcode': info.address.zipCode,
    'postal_code': info.address.zipCode,
    'postcode': info.address.zipCode,
    'country': info.address.country,
    
    // Professional fields
    'company': info.company,
    'organization': info.company,
    'employer': info.company,
    'job_title': info.jobTitle,
    'title': info.jobTitle,
    'position': info.jobTitle,
    'website': info.website,
    'url': info.website,
    
    // Date field
    'date_of_birth': info.dateOfBirth,
    'dob': info.dateOfBirth,
    'birthday': info.dateOfBirth
  };
}

/**
 * Generate autofill script for webpage injection
 */
export function generateAutofillScript(info: PersonalInfo): string {
  const suggestions = getAutofillSuggestions(info);
  
  return `
    (function() {
      console.log('Nillion Autofill: Starting form detection...');
      
      const suggestions = ${JSON.stringify(suggestions)};
      let filledCount = 0;
      
      // Find and fill input fields
      const inputs = document.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        if (input.type === 'password' || input.type === 'hidden') return;
        
        // Try different attribute matching strategies
        const attributes = [
          input.name,
          input.id,
          input.getAttribute('data-field'),
          input.getAttribute('data-name'),
          input.placeholder?.toLowerCase(),
          input.getAttribute('autocomplete')
        ].filter(Boolean);
        
        for (const attr of attributes) {
          const normalizedAttr = attr.toLowerCase().replace(/[-_\\s]/g, '');
          
          for (const [key, value] of Object.entries(suggestions)) {
            const normalizedKey = key.toLowerCase().replace(/[-_\\s]/g, '');
            
            if (normalizedAttr.includes(normalizedKey) || normalizedKey.includes(normalizedAttr)) {
              if (value && !input.value) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
                console.log(\`Filled \${attr} with \${value}\`);
                return;
              }
            }
          }
        }
      });
      
      console.log(\`Nillion Autofill: Filled \${filledCount} fields\`);
      
      if (filledCount > 0) {
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = \`
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
        \`;
        notification.textContent = \`Nillion: Filled \${filledCount} form fields\`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    })();
  `;
}