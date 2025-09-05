# Xell Wallet

A self-custodial cryptocurrency wallet built as a browser extension for Rubix and Trie networks.

## Features

- **Self-Custodial**: Full control over your private keys and funds
- **Multi-Network Support**: Compatible with Rubix and Trie networks (mainnet and testnet)
- **Browser Extension**: Available for Chrome and Firefox
- **Secure**: Advanced security features with local key storage
- **User-Friendly**: Intuitive interface for managing digital assets
- **Transaction Management**: Send, receive, and track transactions
- **Network Configuration**: Flexible RPC endpoint configuration

## Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/xell-wallet.git
   cd xell-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build for your browser**
   
   For Chrome:
   ```bash
   npm run build:chrome
   ```
   
   For Firefox:
   ```bash
   npm run build:firefox
   ```

4. **Load the extension**
   
   **Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder
   
   **Firefox:**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on" and select the manifest file from `dist` folder

### Development Setup

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Lint code**
   ```bash
   npm run lint
   ```

## Architecture Overview

### Core Components

- **Background Script**: Handles extension lifecycle and cross-tab communication
- **Content Script**: Injects wallet functionality into web pages
- **Popup Interface**: Main wallet UI accessible from browser toolbar
- **IndexedDB Storage**: Secure local storage for wallet data and settings

### Key Directories

```
src/
├── api/           # API configuration and axios setup
├── components/    # React UI components
├── context/       # React context providers
├── hooks/         # Custom React hooks
├── indexDB/       # IndexedDB utilities
├── manifest/      # Browser extension manifests
├── pages/         # Main application pages
├── routes/        # Application routing
└── utils/         # Utility functions and configurations
```

### Network Configuration

The wallet supports multiple networks through a flexible configuration system:

- **Rubix Mainnet/Testnet**: Primary blockchain networks
- **Trie Mainnet/Testnet**: Alternative blockchain networks
- **Custom RPC**: User-configurable endpoints

## API Requirements

### Backend Services

The wallet requires the following backend services to be available:

1. **Network APIs**: Blockchain node endpoints for transaction processing
2. **Configuration Service**: External configuration for network parameters
3. **Explorer APIs**: Transaction and address lookup services

### Configuration

The wallet uses two configuration methods:

1. **Direct Code Configuration**: Modify values directly in `config.js` and `src/api/endpoints.js`
2. **External Configuration API**: Dynamic configuration loaded at runtime

## Configuration

### External Configuration

The wallet can be configured via an external JSON configuration file. Update the URL in `config.js`:

```javascript
const CONFIG_API_URL = 'https://your-domain.com/config.json';
```

Example configuration format:
```json
{
  "URLS": {
    "RUBIX_MAINNET_BASE_URL": "https://mainnet-api.example.com",
    "RUBIX_TESTNET_BASE_URL": "https://testnet-api.example.com",
    "TRIE_MAINNET_BASE_URL": "https://trie-mainnet.example.com",
    "TRIE_TESTNET_BASE_URL": "https://trie-testnet.example.com"
  },
  "ALLOWED_ORIGINS": ["https://your-dapp.com"]
}
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Security

For security concerns, please see our [Security Policy](SECURITY.md).

## License

This project is open source. Please check the repository for license details.

## Support

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/your-username/xell-wallet/issues)
- **Discussions**: Join community discussions in [GitHub Discussions](https://github.com/your-username/xell-wallet/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.