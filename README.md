# 🔐 Nillion Private Storage Manager

> A powerful browser extension for managing your Nillion Private Storage with complete control over decentralized identity, encrypted documents, permissions, and personal data.

**🔗 [GitHub Repository](https://github.com/ayushsingh82/Nillion-PSE)**

## ✨ Key Features

### 🆔 **Decentralized Identity Management**
Create and manage your Nillion DID with cryptographic keypairs. Share your identity via QR codes for seamless app connections. Full control over your digital identity with secure storage and retrieval.

### 📄 **Private Document Storage**
Store, manage, and organize encrypted documents in User Owned Collections. Full CRUD operations with automatic metadata tracking, timestamps, and ownership verification.

### 🔐 **Advanced Security**
Protect your extension with biometric authentication or passphrase lock. Robust fallback systems, auto-lock features, and comprehensive security monitoring keep your data safe.

### 🤝 **Granular Permission Control**
Grant and revoke read, write, and execute permissions for external applications. Monitor access in real-time with one-click permission removal and complete audit trails.

### 📊 **Enterprise-Grade Activity Logging**
Track every operation with detailed sub-steps, duration metrics, and status indicators. Export logs in JSON or CSV for analysis. Advanced filtering and search capabilities with real-time statistics dashboard.

### 👤 **Smart Autofill System**
Securely store personal information locally and automatically fill forms across the web. Intelligent recognition of 50+ form field patterns with instant one-click completion and visual feedback.

---

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/ayushsingh82/Nillion-PSE.git
cd Nillion-PSE
npm install
npm run build
```

Load in browser:
1. Open Chrome/Edge → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `dist` folder

### First Use

1. **Create Identity** - Generate your DID with one click
2. **Add Documents** - Store encrypted documents securely
3. **Manage Permissions** - Control who accesses your data
4. **View Activity** - Monitor all operations with detailed logs

---

## 🎯 Core Capabilities

### 📱 Document Management

**Create Documents**
- Navigate to Documents tab → Add Document
- Enter title and content → Save
- Automatic encryption and metadata tracking

**Manage Documents**
- View all documents with details
- Edit or delete with confirmation
- Track creation time and ownership

### 🔑 Permission System

**Grant Access**
- Select document and grantee DID
- Choose permissions: read, write, execute
- Instant grant with activity logging

**Monitor & Revoke**
- View all active permissions
- One-click revocation
- Complete audit trail

### 🔄 Smart Autofill

**Setup**
- Profile tab → Add personal information
- Fill name, email, address, company, etc.
- Save securely in local storage

**Use**
- Visit any website with forms
- Open extension → Profile tab
- Click "🔄 Autofill Page"
- Instant form completion with feedback

### 📊 Activity Monitoring

**View Activities**
- Activity tab shows all operations
- Color-coded status indicators
- Click to expand sub-steps and details

**Filter & Search**
- Search by text across all activities
- Filter by type (Document, Permission, Autofill, etc.)
- Filter by status (Success, Failed, Warning)

**Statistics Dashboard**
- Total operations count
- Today's and weekly activity
- Average operation duration
- Status breakdown visualization

**Export Logs**
- Download as JSON (full data) or CSV (spreadsheet)
- Automatic timestamped filenames
- Perfect for compliance and analysis

---

## 🎨 Activity Log Features

### Detailed Sub-Step Tracking

Every operation is tracked with granular sub-steps:

**Document Creation** (4 sub-steps)
```
1. ✅ Generating unique document ID
2. ✅ Creating document structure
3. ✅ Storing document in secure storage
4. ✅ Logging activity
⏱️ Duration: 234ms
```

**Autofill Execution** (5 sub-steps)
```
1. ✅ Getting active tab
2. ✅ Preparing autofill data (8 fields)
3. ✅ Injecting autofill script
4. ✅ Autofill completed (5 fields filled)
5. ✅ Showing notification
⏱️ Duration: 156ms
```

### Activity Types

- 🆔 **Identity Operations** - Created, Imported, Exported
- 📄 **Documents** - Created, Read, Deleted
- ✅ **Permissions** - Granted, Revoked
- 🔄 **Autofill** - Execution with field counts
- 💾 **Data Export** - JSON/CSV downloads
- 🔒 **Security** - Authentication changes

### Export Formats

**JSON Export** - Complete data with all metadata
```json
{
  "id": "abc123",
  "type": "DOCUMENT_CREATED",
  "description": "Creating document",
  "status": "success",
  "timestamp": 1697472000000,
  "duration": 234,
  "subSteps": [...]
}
```

**CSV Export** - Spreadsheet compatible
```
ID, Timestamp, Date, Type, Description, Status, Duration, Sub Steps
abc123, 1697472000000, 2025-10-16, DOCUMENT_CREATED, "Creating document", success, 234, "1. Generating ID; 2. Creating structure..."
```

---

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 4.5 with custom extension config
- **Styling**: Tailwind CSS 3.3
- **Blockchain**: Nillion SDK (@nillion/nuc, @nillion/secretvaults)
- **APIs**: WebExtension Polyfill for cross-browser support

### Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx          # Main interface
│   ├── ActivityLogTab.tsx     # Activity monitoring UI
│   ├── PersonalInfoTab.tsx    # Profile & autofill
│   └── AuthComponents.tsx     # Security modals
├── services/
│   ├── realNillionService.ts  # Core Nillion integration
│   ├── activityLogger.ts      # Advanced logging system
│   ├── authService.ts         # Authentication
│   ├── personalInfoService.ts # Autofill engine
│   └── secureStorage.ts       # Identity management
└── pages/
    ├── popup/                 # Extension popup
    ├── background/            # Service worker
    └── options/               # Settings page
```

---

## 🔒 Security & Privacy

### Data Protection
- **100% Local Storage** - No cloud, no servers, no external transmission
- **Browser-Native Encryption** - Leverages built-in security APIs
- **User-Controlled** - Complete ownership of all data and permissions
- **Minimal Permissions** - Only essential browser APIs used

### Required Permissions
- `storage` - Local data storage
- `activeTab` - Current page access for autofill
- `scripting` - Form autofill injection
- `unlimitedStorage` - Documents and logs storage
- `host_permissions` - Web page script execution

---

## 📚 Documentation

- **[ACTIVITY_LOG_FEATURES.md](./ACTIVITY_LOG_FEATURES.md)** - Complete activity logging documentation
- **[ACTIVITY_LOG_GUIDE.md](./ACTIVITY_LOG_GUIDE.md)** - Quick start guide with examples
- **[LICENSE](./LICENSE)** - MIT License

---

## 🎯 Use Cases

### Personal Data Management
- Store sensitive documents securely
- Control access with fine-grained permissions
- Track all document operations
- Export activity for personal records

### Developer Tools
- Test Nillion integration locally
- Monitor API calls and operations
- Debug with detailed sub-step logs
- Export data for analysis

### Compliance & Audit
- Complete activity audit trail
- Export logs in multiple formats
- Track who accessed what and when
- Monitor operation success rates

### Productivity
- Auto-fill forms instantly
- Secure personal information storage
- Quick document access
- Streamlined permission management

---

## 🤝 Contributing

We welcome contributions! 

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with the [Nillion](https://nillion.com/) Private Storage infrastructure for decentralized, secure data management.

---

## 📞 Support

- 📖 Check documentation files
- 🐛 Use built-in debug tools (🐛 button)
- 📊 Review activity logs for operation details
- 💾 Export logs for detailed analysis
- 🔍 Open GitHub issue with exported logs if needed

---

**Built with ❤️ for secure, private, user-controlled data in the decentralized web.**

*Nillion Private Storage Manager - Your data, your control, your privacy.*
