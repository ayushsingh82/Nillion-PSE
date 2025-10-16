# 🔐 Nillion Private Storage Manager

> A comprehensive browser extension for managing your Nillion Private Storage User Owned Collections with full control over DIDs, data, app permissions, and personal information.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Nillion](https://img.shields.io/badge/Nillion-FF6B6B?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMjIgMjJIMkwxMiAyWiIgZmlsbD0iY3VycmVudENvbG9yIi8+Cjwvc3ZnPgo=)](https://nillion.com/)

## 🌟 Features

### 🔑 **Identity Management**
- **Secure DID Generation**: Create and manage your Nillion Decentralized Identity
- **Keypair Management**: Automatic generation and secure storage of cryptographic keys
- **QR Code Sharing**: Display your DID as QR code for easy app connections
- **Identity Persistence**: Reliable storage and retrieval across browser sessions

### 📄 **Document Storage**
- **Private Document Management**: Store, retrieve, and manage encrypted documents
- **Collection Organization**: Organize documents in User Owned Collections
- **CRUD Operations**: Full create, read, update, delete functionality
- **Metadata Tracking**: Automatic timestamping and ownership tracking

### 🔐 **Security & Authentication**
- **Biometric/Passphrase Lock**: Secure your extension with biometric or passphrase authentication
- **Crypto Compatibility**: Robust fallback systems for browser crypto APIs
- **Auto-lock Features**: Automatic security when extension is closed
- **Debug Tools**: Comprehensive debugging for troubleshooting

### 🤝 **Permission Management**
- **Access Control**: Grant and revoke permissions for external applications
- **Granular Permissions**: Control read, write, and execute access
- **Permission Tracking**: Monitor who has access to your data
- **Easy Revocation**: One-click permission removal

### 📊 **Activity Monitoring**
- **Comprehensive Logging**: Track all document and permission activities
- **Real-time Updates**: Live activity feed with timestamps
- **Activity Types**: Document creation, deletion, permission changes
- **Audit Trail**: Complete history of all extension activities

### 👤 **Personal Information & Autofill**
- **Secure Profile Storage**: Store personal information locally and securely
- **Smart Autofill**: Automatically fill forms across websites
- **Field Recognition**: Intelligent detection of 50+ common form field patterns
- **One-Click Fill**: Instant form completion with visual feedback
- **Data Privacy**: All information stored locally, never transmitted

## 🚀 Quick Start

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/nillion-extension.git
   cd nillion-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Browser**
   - Open Chrome/Edge and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder
   - The Nillion extension will appear in your extensions list

### First Time Setup

1. **Create Identity**
   - Click the extension icon
   - Click "Create Identity" to generate your DID
   - Your identity will be automatically saved

2. **Setup Security (Optional)**
   - Click "Setup Authentication"
   - Choose passphrase or biometric authentication
   - Configure your preferred security method

3. **Add Personal Info (Optional)**
   - Go to the "Profile" tab
   - Click "Add Personal Info"
   - Fill in your details for autofill functionality

## 📱 Usage

### Managing Documents

**Add a Document:**
1. Go to "Documents" tab
2. Click "Add Document"
3. Enter title and content
4. Click "Save Document"

**View/Edit Documents:**
- Click on any document to view details
- Use edit/delete buttons for modifications

### Managing Permissions

**Grant Access:**
1. Go to "Permissions" tab
2. Click "Grant Permission"
3. Enter grantee DID and select permissions
4. Click "Grant Access"

**Revoke Access:**
- Find the permission in the list
- Click "Revoke" button

### Using Autofill

**Setup:**
1. Go to "Profile" tab
2. Add your personal information
3. Click "Save"

**Use:**
1. Navigate to any website with forms
2. Open the extension
3. Go to "Profile" tab
4. Click "🔄 Autofill Page"

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18.2.0 + TypeScript
- **Bundler**: Vite 4.5.0 with custom extension configuration
- **Styling**: Tailwind CSS 3.3.0
- **Nillion SDK**: @nillion/secretvaults, @nillion/nuc
- **Browser APIs**: WebExtension Polyfill for cross-browser compatibility

### Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard component
│   ├── AuthComponents.tsx # Authentication modals
│   └── PersonalInfoTab.tsx # Personal info management
├── services/            # Core services
│   ├── nillionService.ts # Main Nillion integration
│   ├── authService.ts   # Authentication management
│   ├── personalInfoService.ts # Personal info & autofill
│   └── secureStorage.ts # Identity storage
├── pages/               # Extension pages
│   ├── popup/          # Extension popup
│   ├── background/     # Service worker
│   └── options/        # Extension options
└── types/              # TypeScript type definitions
```

### Development Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview built extension
npm run preview
```

### Configuration Files

- `manifest.json` - Extension manifest (Manifest V3)
- `vite.config.ts` - Vite bundler configuration
- `tailwind.config.cjs` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## 🔧 Features Deep Dive

### Authentication System

The extension includes a robust authentication system with:

- **Crypto API Fallbacks**: Automatic fallback for browsers with limited crypto support
- **Secure Hashing**: SHA-256 with salt for passphrase storage
- **Biometric Support**: Integration with browser biometric APIs
- **Session Management**: Automatic lock/unlock functionality

### Personal Information Management

Comprehensive personal data management with:

- **Structured Storage**: Organized fields for all personal information
- **Smart Autofill**: Advanced field recognition and form filling
- **Privacy First**: All data stored locally, never transmitted
- **Field Mapping**: Support for 50+ common form field patterns

### Nillion Integration

Real integration with Nillion's Private Storage:

- **Secret Vaults**: Direct integration with @nillion/secretvaults
- **User Client**: Full user client functionality for data operations
- **Permission System**: Native support for Nillion's permission model
- **Real Data**: No mock data - actual blockchain operations

## 🔒 Security & Privacy

### Data Protection

- **Local Storage Only**: All data stored in browser extension storage
- **No Cloud Sync**: Information never leaves your device
- **Encryption**: Browser-native encryption for sensitive data
- **User Control**: Complete control over data sharing and permissions

### Extension Permissions

The extension requires minimal permissions:

- `storage` - Store user data locally
- `activeTab` - Access current page for autofill
- `unlimitedStorage` - Store documents and activity logs

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
- Refresh the extension in Chrome's extension management
- Check browser console for errors
- Ensure all dependencies are installed

**Authentication not working:**
- Use "Skip Auth (Debug)" button for testing
- Check crypto API compatibility in browser console
- Clear auth storage and re-setup

**Autofill not working:**
- Ensure extension has permission for the current site
- Check that form fields are visible and editable
- Try refreshing the page and attempting again

**Identity keeps resetting:**
- Check browser storage using the 🐛 debug button
- Ensure extension isn't being reset by browser
- Verify identity persistence in storage logs

### Debug Tools

The extension includes comprehensive debugging:

- **Storage Inspector**: 🐛 button to view all stored data
- **Console Logging**: Detailed logs for all operations
- **Auth Debug**: Step-by-step authentication flow logging
- **Error Handling**: Comprehensive error reporting

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Add JSDoc comments for functions
- Test thoroughly across different browsers
- Maintain backward compatibility

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add error handling for all async operations
- Include user feedback for all actions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Nillion](https://nillion.com/) for the Private Storage infrastructure
- [React](https://reactjs.org/) for the component framework
- [Vite](https://vitejs.dev/) for the excellent build tooling
- [Tailwind CSS](https://tailwindcss.com/) for the styling system

## 📞 Support

If you encounter any issues or need help:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the browser console for error messages
3. Use the built-in debug tools (🐛 button)
4. Open an issue on GitHub with detailed information

---

**Built with ❤️ for the Nillion ecosystem**

*Secure, private, and user-controlled data management for the decentralized web.*

## Installation

### Prerequisites
- Node.js 16+ and npm
- Chrome or Chromium-based browser

### Build the Extension

```bash
# Install dependencies
npm install --legacy-peer-deps

# Build the extension
npm run build
```

The built extension will be in the `dist` folder.

### Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder
5. The extension icon will appear in your toolbar

## Usage

### Initial Setup
1. Click the extension icon to open the dashboard
2. A DID and keypair are automatically generated on first use
3. Your identity is securely stored in the browser

### Dashboard Features

**Overview Tab**
- View your DID (Decentralized Identifier)
- See summary of collections and activity

**Data Tab**
- Create new data documents
- View existing documents
- Delete documents
- Search and filter data

**Permissions Tab**
- Grant app access to your data
- Set read/write/execute permissions
- Revoke access from apps
- View all active permissions

**Activity Log Tab**
- Complete audit trail of operations
- Search and filter activities
- Export logs for compliance

## Project Structure

```
src/
├── services/
│   ├── secureStorage.ts      # Identity management
│   ├── nillionClient.ts      # Nillion API wrapper
│   ├── activityLogger.ts     # Activity tracking
│   └── permissionManager.ts  # Access control
├── components/
│   └── Dashboard.tsx         # Main UI component
├── pages/
│   ├── background/           # Background service worker
│   ├── popup/                # Extension popup
│   └── content/              # Content scripts
└── types/
    └── index.ts              # TypeScript definitions
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Architecture

### Identity Management
- Uses `Keypair.generate()` from @nillion/nuc
- DID format: `did:nil:[66-char-identifier]`
- Secure storage using browser.storage.local API

### Data Operations
- User Owned Collections for private data
- Encrypted storage using Nillion's blindfold encryption
- Grant/revoke access with fine-grained permissions

### App Integration
Apps can integrate using the postMessage API:

```javascript
// Request permission from user
window.postMessage({
  type: 'NILLION_REQUEST_ACCESS',
  appId: 'your-app-id',
  permissions: { read: true, write: false }
}, '*');

// Listen for response
window.addEventListener('message', (event) => {
  if (event.data.type === 'NILLION_ACCESS_GRANTED') {
    // Access granted, proceed with operations
  }
});
```

## Security

- Private keys never leave the browser
- All data encrypted before storage
- Permissions verified on every operation
- Complete activity audit trail

## Current Status

⚠️ **Note**: This extension uses Nillion SDK packages installed directly from GitHub as they are not yet published to npm. Some network operations use mock implementations for demonstration purposes.

### Working Features
✅ Identity generation and management
✅ Dashboard UI with all tabs
✅ Activity logging
✅ Permission management UI
✅ Browser storage integration

### Production Ready
When @nillion/secretvaults-ts is published to npm, the extension will automatically support live network operations.

## Troubleshooting

### Extension won't load
- Make sure you ran `npm run build`
- Check that Developer mode is enabled in chrome://extensions/
- Try removing and re-adding the extension

### Identity not saving
- Check browser console for errors
- Verify storage permissions in manifest.json
- Try clearing browser storage and regenerating identity

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
