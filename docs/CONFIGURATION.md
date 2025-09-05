# Configuration Guide

This document explains how to configure Xell Wallet for different environments and use cases.

## Configuration Methods

Xell Wallet supports multiple configuration methods for browser extensions:

1. **External Configuration API** (Runtime - Highest priority)
2. **Direct Code Configuration** (Modify source files)
3. **Default Values** (Fallback - Lowest priority)

**Important**: Browser extensions cannot use environment variables at runtime. Configuration is done by modifying source files or using external configuration.

## External Configuration API

### Setup

Configure the external configuration URL in `config.js`:

```javascript
// In config.js
const CONFIG_API_URL = 'https://your-domain.com/config.json';
```

### Configuration Format

The external configuration should be a JSON file with the following structure:

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

### Benefits

- **Dynamic Updates**: Change configuration without rebuilding the extension
- **Environment Management**: Different configs for dev/staging/production
- **Centralized Control**: Manage multiple deployments from one location

## Direct Code Configuration

### Configurable Files

To customize the wallet for your deployment, modify these files:

**1. External Configuration URL** (`config.js`):
```javascript
const CONFIG_API_URL = 'https://your-domain.com/config.json';
```

**2. Analytics Endpoint** (`src/api/endpoints.js`):
```javascript
const analyticsUrl = 'https://your-analytics-api.com/api/Analytics/GetKPIDetails';
```

**3. Default Network URLs** (`config.js`):
```javascript
export const config = {
    RUBIX_MAINNET_BASE_URL: 'https://your-rubix-mainnet.com',
    RUBIX_TESTNET_BASE_URL: 'https://your-rubix-testnet.com',
    // ... other configurations
};
```

**Build Process**:
1. Modify the configuration files with your values
2. Run `npm run build:chrome` or `npm run build:firefox`
3. Extension uses your configured values + external config at runtime

### Environment-Specific Configuration

You can create different configuration files for different environments by modifying the source files directly for each deployment.

## Network Configuration

### Supported Networks

The wallet supports these network types:

| Network ID | Name | Type |
|------------|------|------|
| 1 | Rubix Mainnet | Mainnet |
| 2 | Rubix Testnet | Testnet |
| 3 | Trie Testnet | Testnet |
| 4 | Trie Mainnet | Mainnet |

### Custom RPC Networks

Users can add custom RPC networks through the wallet interface:

1. Go to Settings → Networks
2. Click "Add Network"
3. Enter network details:
   - Network Name
   - RPC URL
   - Chain ID (if applicable)
   - Currency Symbol
   - Block Explorer URL

### Network Switching

The wallet automatically selects the appropriate API endpoint based on:

1. User's selected network in settings
2. Network configuration from external config
3. Default values in config.js

## Security Configuration

### Content Security Policy

The extension uses strict CSP policies defined in the manifest files:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Allowed Origins

Configure which websites can interact with the wallet:

```json
{
  "ALLOWED_ORIGINS": [
    "https://trusted-dapp.com",
    "https://another-trusted-site.com"
  ]
}
```

### Permissions

The extension requests minimal permissions:

- `storage` - Local data storage
- `activeTab` - Current tab access
- `scripting` - Content script injection
- `alarms` - Background tasks

## Development Configuration

### Local Development

For local development, modify `config.js` with local endpoints:

```javascript
const CONFIG_API_URL = 'http://localhost:3001/config.json';

export const config = {
    RUBIX_TESTNET_BASE_URL: 'http://localhost:8080',
    // ... other local configurations
};
```

Then build with: `npm run build:chrome`

### Testing Configuration

For testing environments, update configuration files with staging endpoints:

```javascript
const CONFIG_API_URL = 'https://staging-config.example.com/config.json';

export const config = {
    RUBIX_TESTNET_BASE_URL: 'https://staging-api.example.com',
    // ... other staging configurations
};
```

Build with: `npm run build:chrome`

## Production Configuration

### Deployment Checklist

Before deploying to production:

- [ ] Set production API endpoints
- [ ] Disable debug mode
- [ ] Configure proper CSP policies
- [ ] Set up monitoring endpoints
- [ ] Verify all external configurations
- [ ] Test with production networks

### Example Production Config

**config.js**:
```javascript
const CONFIG_API_URL = 'https://config.example.com/config.json';

export const config = {
    RUBIX_MAINNET_BASE_URL: 'https://mainnet-api.example.com',
    RUBIX_TESTNET_BASE_URL: 'https://testnet-api.example.com',
    // ... production configurations
};
```

## Troubleshooting

### Configuration Loading Issues

1. **Check network connectivity** to external config URL
2. **Verify JSON syntax** in external configuration
3. **Check browser console** for configuration errors
4. **Validate configuration values** in source files

### Common Issues

**Config not loading:**
- Verify the external config URL is accessible
- Check CORS headers on the config server
- Ensure JSON is valid

**Wrong network endpoints:**
- Check configuration priority order
- Verify values in config.js and endpoints.js
- Ensure external config has correct structure

**Permission errors:**
- Verify manifest permissions
- Check CSP policies
- Ensure allowed origins are configured

### Debug Mode

To enable debug logging, modify the loadConfig function in `config.js`:

```javascript
async function loadConfig() {
    try {
        const response = await fetch(CONFIG_API_URL);
        const data = await response.json();
        // ... rest of function
    } catch (error) {
        console.error('Config loading failed:', error);
    }
}
```

## Best Practices

### Security

- Never commit sensitive configuration to version control
- Use HTTPS for all external configuration URLs
- Regularly rotate API keys and endpoints
- Implement proper CORS policies

### Performance

- Cache external configuration appropriately
- Use CDN for configuration files when possible
- Minimize configuration file size
- Implement fallback mechanisms

### Maintenance

- Document all configuration changes
- Test configuration changes in staging first
- Monitor configuration loading errors
- Keep backup configurations available