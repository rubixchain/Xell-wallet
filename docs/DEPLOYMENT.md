# Deployment Guide

This guide covers how to build and deploy Xell Wallet for different browsers and environments.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

## Environment Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-username/xell-wallet.git
   cd xell-wallet
   npm install
   ```

2. **Configure endpoints** (optional)
   ```bash
   # Edit config.js and src/api/endpoints.js with your configuration
   # These values will be compiled into the extension
   ```

## Building for Production

### Chrome Extension

1. **Build for Chrome**
   ```bash
   npm run build:chrome
   ```

2. **Package for distribution**
   ```bash
   cd dist
   zip -r xell-wallet-chrome-v2.0.3.zip .
   ```

3. **Update manifest version** (if needed)
   - Edit `src/manifest/chrome.json`
   - Update the `version` field
   - Rebuild

### Firefox Extension

1. **Build for Firefox**
   ```bash
   npm run build:firefox
   ```

2. **Package for distribution**
   ```bash
   cd dist
   zip -r xell-wallet-firefox-v2.0.3.zip .
   ```

3. **Update extension ID**
   - Edit `src/manifest/firefox.json`
   - Replace `{EXTENSION_ID}` with your actual extension ID
   - Rebuild

## Configuration Management

### External Configuration

The wallet can be configured via an external JSON file:

```json
{
  "URLS": {
    "RUBIX_MAINNET_BASE_URL": "https://mainnet-api.example.com",
    "RUBIX_TESTNET_BASE_URL": "https://testnet-api.example.com",
    "TRIE_MAINNET_BASE_URL": "https://trie-mainnet.example.com",
    "TRIE_TESTNET_BASE_URL": "https://trie-testnet.example.com",
    "RUBIX_TESTNET_TXN_LINK": "https://testnet-explorer.example.com/tx/",
    "RUBIX_MAINNET_TXN_LINK": "https://mainnet-explorer.example.com/tx/",
    "TRIE_TESTNET_TXN_LINK": "https://trie-testnet-explorer.example.com/tx/",
    "RUBIX_TESTNET_FAUCET_LINK": "https://testnet-faucet.example.com",
    "TRIE_TESTNET_FAUCET_LINK": "https://trie-testnet-faucet.example.com"
  },
  "ALLOWED_ORIGINS": [
    "https://your-dapp.example.com",
    "https://another-dapp.example.com"
  ]
}
```

### Configuration Files

Modify these files with your endpoints:

**config.js**:
```javascript
const CONFIG_API_URL = 'https://your-domain.com/config.json';

export const config = {
    RUBIX_MAINNET_BASE_URL: 'https://your-rubix-mainnet.com',
    RUBIX_TESTNET_BASE_URL: 'https://your-rubix-testnet.com',
    // ... other configurations
};
```

**src/api/endpoints.js**:
```javascript
const analyticsUrl = 'https://your-analytics-api.com/api/Analytics/GetKPIDetails';
```

## Browser Store Deployment

### Chrome Web Store

1. **Prepare submission**
   - Build and zip the extension
   - Prepare store assets (icons, screenshots, descriptions)
   - Update privacy policy and terms of service

2. **Submit to Chrome Web Store**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Upload the zip file
   - Fill in store listing details
   - Submit for review

### Firefox Add-ons

1. **Prepare submission**
   - Build and zip the extension
   - Ensure manifest v2 compatibility
   - Prepare store assets

2. **Submit to Firefox Add-ons**
   - Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - Upload the zip file
   - Fill in listing details
   - Submit for review

## Security Considerations

### Before Deployment

- [ ] Remove all hardcoded credentials
- [ ] Verify no sensitive data in source code
- [ ] Update all placeholder values in manifests
- [ ] Test with production API endpoints
- [ ] Verify CSP policies are correct
- [ ] Run security audit: `npm audit`

### Extension IDs

**Chrome:**
- Extension ID is generated automatically by Chrome Web Store
- Update any references to extension ID after first publication

**Firefox:**
- Replace `{EXTENSION_ID}` in `src/manifest/firefox.json` with your actual ID
- Format: `your-extension@your-domain.com` or UUID

## Testing Deployment

### Local Testing

1. **Load unpacked extension**
   ```bash
   npm run build:chrome  # or build:firefox
   ```
   
2. **Load in browser**
   - Chrome: `chrome://extensions/` → "Load unpacked"
   - Firefox: `about:debugging` → "Load Temporary Add-on"

3. **Test all functionality**
   - Wallet creation and import
   - Network switching
   - Transaction sending/receiving
   - Settings and security features

### Production Testing

1. **Test with production APIs**
   - Update config.js and endpoints.js with production endpoints
   - Rebuild and test

2. **Cross-browser testing**
   - Test in different browser versions
   - Verify compatibility

## Rollback Procedures

### Emergency Rollback

1. **Identify the issue**
2. **Revert to previous version**
   ```bash
   git checkout v2.0.2  # or last stable version
   npm run build:chrome
   npm run build:firefox
   ```
3. **Submit emergency update to stores**

### Gradual Rollback

1. **Update external configuration** to redirect to stable endpoints
2. **Monitor user reports**
3. **Plan proper fix and deployment**

## Monitoring and Maintenance

### Post-Deployment

- Monitor browser store reviews and ratings
- Track error reports and user feedback
- Monitor API endpoint health
- Keep dependencies updated
- Regular security audits

### Version Management

- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update CHANGELOG.md for each release
- Tag releases in Git
- Maintain release notes

## Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version compatibility
- Clear `node_modules` and reinstall
- Verify configuration values in source files

**Extension Loading Issues:**
- Check manifest syntax
- Verify file permissions
- Check browser console for errors

**API Connection Issues:**
- Verify network endpoints are accessible
- Check CORS configuration
- Validate API authentication

### Support Channels

- GitHub Issues for bug reports
- GitHub Discussions for questions
- Security email for security issues