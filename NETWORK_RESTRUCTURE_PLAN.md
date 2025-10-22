# Network Restructure Implementation Plan

## Overview
Restructure the wallet from 4 independent networks to a swarm-based architecture where networks contain multiple nodes, and accounts are bound to specific nodes within a network.

---

## Current vs New Architecture

### Current Structure:
- 4 independent networks: Rubix Mainnet, Rubix Testnet, Trie Mainnet, Trie Testnet
- Each network is separate
- Account exists on one network only

### New Structure:
- 3 networks (swarm keys):
  1. **Rubix Mainnet** (swarm key + multiple nodes)
  2. **Rubix Testnet** (swarm key + multiple nodes)
  3. **Custom Network** (user-defined swarm key + nodes)

- **Network** = Swarm Key (group of nodes sharing same swarm)
- **Node** = URL/RPC endpoint
- **Account binding**: Username → Network → Specific Node

---

## Core Rules

### Account Creation Rules:
1. ✅ Same account CAN exist in different networks
   - Example: "Alice" in Rubix Mainnet + "Alice" in Rubix Testnet
2. ❌ Same account CANNOT exist twice in the same network (even on different nodes)
   - Example: "Alice" cannot be on both Node A and Node B in Rubix Mainnet
3. 🔒 Once account is created on a node, it's **permanent** (cannot switch nodes within same network)

### Node Addition Rules:
1. **Rubix Mainnet/Testnet**:
   - Have default nodes (pre-configured)
   - Users can add custom nodes
   - **Must verify**: Custom node's swarm key matches network's swarm key
2. **Custom Network**:
   - User provides both swarm key and node URL
   - No verification needed (user is defining the network)

---

## Data Structure

### Storage Schema (IndexedDB)

```javascript
// Network definition
Network {
  id: 1, // Network ID
  name: "Rubix Mainnet",
  swarmKey: "0x123abc...", // Swarm key for this network
  tokenSymbol: "RBT",
  nodes: [
    {
      id: 1,
      url: "https://node1.rubix.com",
      name: "Official Node 1",
      isDefault: true,
      selected: false
    },
    {
      id: 2,
      url: "https://custom-node.rubix.com",
      name: "Custom Node",
      isDefault: false,
      selected: false
    }
  ]
}

// Account storage
Account {
  username: "Alice",
  did: "did:rubix:...",
  publickey: "...",
  privatekey: "...", // encrypted
  networkId: 1, // Which network (Rubix Mainnet)
  nodeId: 1, // Which specific node in that network
  nodeUrl: "https://node1.rubix.com",
  swarmKey: "0x123abc...",
  // ... other fields
}

// Network binding (for duplicate prevention)
NetworkBinding {
  username: "Alice",
  networkId: 1, // Rubix Mainnet
  nodeId: 1,
  nodeUrl: "https://node1.rubix.com"
}
```

### Global Network Configuration

```javascript
// Default networks
const DEFAULT_NETWORKS = [
  {
    id: 1,
    name: "Rubix Mainnet",
    swarmKey: "RUBIX_MAINNET_SWARM_KEY", // To be fetched from config
    tokenSymbol: "RBT",
    nodes: [
      {
        id: 1,
        url: "https://node1.rubix.network",
        name: "Rubix Node 1",
        isDefault: true
      },
      {
        id: 2,
        url: "https://node2.rubix.network",
        name: "Rubix Node 2",
        isDefault: true
      }
    ]
  },
  {
    id: 2,
    name: "Rubix Testnet",
    swarmKey: "RUBIX_TESTNET_SWARM_KEY",
    tokenSymbol: "RBT",
    nodes: [
      {
        id: 1,
        url: "https://testnet-node1.rubix.network",
        name: "Testnet Node 1",
        isDefault: true
      }
    ]
  }
];
```

---

## User Flows

### 1. Create New Account Flow

```
1. User clicks "Create Wallet"
2. Enter username
3. SELECT NETWORK:
   - Show: Rubix Mainnet, Rubix Testnet, Custom Network
4. SELECT/ADD NODE:
   - If Rubix Mainnet/Testnet:
     a. Show list of nodes (default + custom)
     b. User can select existing node OR add new custom node
     c. If adding custom node:
        - Enter node URL
        - Fetch swarm key from node
        - Verify: node.swarmKey === network.swarmKey
        - If match: Add node, proceed
        - If mismatch: Show error "Node belongs to different network"
   - If Custom Network:
     a. Enter network name
     b. Enter swarm key
     c. Enter node URL
     d. No verification needed
5. CHECK DUPLICATE:
   - Query: Does this username exist in this network?
   - If yes: Show error "Account already exists in this network"
   - If no: Proceed
6. Create account on selected node
7. Save account with network + node binding
```

### 2. Account Switch Flow (with Network Selection)

```
1. User clicks account dropdown in dashboard header
2. User selects a different account (e.g., Account 2)
3. Show Network Selection Screen (no PIN required - respects auto-lock timeout)

NETWORK SELECTION SCREEN displays:

For each network, show all nodes with the following logic:

Example for Account 2:

┌─────────────────────────────────────────────┐
│  🌐 Rubix Mainnet                           │
│    ✅ Node 2 (enabled - Account 2 exists,   │
│              can switch)                     │
│    ⚫ Node 1 (grayed - Account 2 doesn't    │
│              exist here)                     │
│    ⚫ + Add Custom Node (grayed - Account 2 │
│         already exists on Node 2)           │
├─────────────────────────────────────────────┤
│  🧪 Rubix Testnet                           │
│    ⚫ Node 3 (grayed - Account 2 doesn't    │
│              exist here)                     │
│    ⚫ Node 4 (grayed - Account 2 doesn't    │
│              exist here)                     │
│    ✅ + Add Custom Node (enabled - Account 2│
│         doesn't exist in this network)      │
├─────────────────────────────────────────────┤
│  ⚙️  Custom Networks                         │
│    ✅ + Add Custom Network (enabled -       │
│         can always add new network)         │
└─────────────────────────────────────────────┘

4. User selects network/node:
   a. If account exists on that node (already mapped):
      → Switch directly to that account on that network
      → Show dashboard immediately

   b. If account does NOT exist on that node (not mapped):
      → Call create DID API on that node (reuse existing DID, public key, private key)
      → Register account on that node
      → Save account-node mapping to storage
      → Switch to that account on that node
      → Show dashboard

   c. If "Add Custom Node" selected:
      → Show add node modal (enter node URL)
      → Verify swarm key matches network
      → If valid: Add node to network
      → Call create DID API on new node (reuse existing credentials)
      → Save account-node mapping
      → Switch to that account on that node
      → Show dashboard

   d. If "Add Custom Network" selected:
      → Show add network modal (enter network name, swarm key, node URL)
      → No verification needed (user-defined)
      → Add custom network with node
      → Call create DID API on new network's node (reuse existing credentials)
      → Save account-network-node mapping
      → Switch to that account
      → Show dashboard

KEY RULES FOR NODE DISPLAY:
✅ Enable nodes where account already exists (can switch)
⚫ Gray out nodes where account doesn't exist
⚫ Gray out "Add Custom Node" if account already exists on ANY node in that network
✅ Enable "Add Custom Node" ONLY if account doesn't exist on ANY node in that network
✅ Always enable "Add Custom Network"

IMPORTANT NOTES:
- Multiple accounts CAN exist on the same node (e.g., Node 1 can have both Alice and Bob)
- Same account credentials (DID, public key, private key) are REUSED when creating on new nodes
- We register the existing account on the new node, not create entirely new credentials
```

### 3. Network Switcher (Settings) Flow

```
1. User clicks network switcher (globe icon) in settings
2. Show networks with their nodes for CURRENT account:

Example for Account 1 currently on Node 1:

┌─────────────────────────────────────────────┐
│  🌐 Rubix Mainnet                           │
│    ✅ Node 1 (selected - current)           │
│    ⚫ Node 2 (grayed - Account 1 doesn't    │
│              exist here)                     │
│    ⚫ + Add Custom Node (grayed - Account 1 │
│         already exists on Node 1)           │
├─────────────────────────────────────────────┤
│  🧪 Rubix Testnet                           │
│    ✅ Node 3 (enabled - Account 1 exists,   │
│              can switch)                     │
│    ⚫ Node 4 (grayed - Account 1 doesn't    │
│              exist here)                     │
│    ⚫ + Add Custom Node (grayed - Account 1 │
│         already exists on Node 3)           │
├─────────────────────────────────────────────┤
│  ⚙️  Custom Networks                         │
│    ✅ + Add Custom Network (enabled)        │
└─────────────────────────────────────────────┘

3. User selects:
   a. If enabled node (account already mapped):
      → Switch to it immediately
      → Show dashboard

   b. If "Add Custom Node" (only if enabled):
      → Show add node modal (enter node URL)
      → Verify swarm key matches network
      → If valid: Add node to network
      → Call create DID API on new node (reuse existing credentials)
      → Save account-node mapping
      → Switch to that node
      → Show dashboard

   c. If "Add Custom Network":
      → Show add network modal (enter network name, swarm key, node URL)
      → Add custom network with node
      → Call create DID API on new network's node (reuse existing credentials)
      → Save account-network-node mapping
      → Switch to that network
      → Show dashboard

DISPLAY LOGIC:
- Show ALL nodes in each network
- Enable only nodes where current account exists
- Gray out nodes where account doesn't exist
- Gray out "Add Custom Node" if account exists on ANY node in that network
- Enable "Add Custom Node" only if account doesn't exist on ANY node in that network
- Always enable "Add Custom Network"

IMPORTANT NOTES:
- Multiple accounts CAN exist on the same node (e.g., Node 1 can have both Alice and Bob)
- Same account credentials (DID, public key, private key) are REUSED when creating on new nodes
- We register the existing account on the new node, not create entirely new credentials
```

### 4. Add Custom Node Flow

```
1. User in network selector → Click "Add Node" for Rubix Mainnet/Testnet
2. Enter node URL: https://custom-node.com
3. VERIFY SWARM KEY:
   a. Call API: GET https://custom-node.com/api/swarm-key
   b. Compare: node.swarmKey === network.swarmKey
   c. If match:
      - Add node to network
      - Show success
   d. If mismatch:
      - Show error: "This node belongs to a different network"
      - Display: Expected swarm: XXX, Got: YYY
4. Node added to available nodes list
```

### 5. Add Custom Network Flow

```
1. User clicks "Add Custom Network"
2. Enter:
   - Network Name: "My Private Network"
   - Swarm Key: "0xabc123..."
   - Node URL: "https://my-node.com"
3. No verification (user is defining the network)
4. Network added to list
5. Can add more nodes to this custom network later
```

---

## Summary of Key Display Rules

### For Account Switching & Network Settings:

**Critical Logic:**
1. **If account exists on ANY node in a network:**
   - ✅ Enable that specific node (can switch to it)
   - ⚫ Gray out all other nodes in that network
   - ⚫ Gray out "+ Add Custom Node" for that network

2. **If account does NOT exist on ANY node in a network:**
   - ⚫ Gray out all nodes in that network
   - ✅ Enable "+ Add Custom Node" for that network (can add node and create account)

3. **Custom Networks:**
   - ✅ Always enable "+ Add Custom Network" (can always create new network)

**Visual Example:**

Account exists on Node 2 in Rubix Mainnet:
- ✅ Node 2 (enabled)
- ⚫ Node 1, Node 3, Node 4 (grayed)
- ⚫ + Add Custom Node (grayed)

Account does NOT exist in Rubix Testnet:
- ⚫ All testnet nodes (grayed)
- ✅ + Add Custom Node (enabled)

---

## Migration Plan

### Existing User Migration

When a user with old accounts opens the updated wallet:

```
MIGRATION SCREEN:
─────────────────────────────────────────
  Network Restructure Update
─────────────────────────────────────────

We've updated our network architecture!

Your accounts are being migrated to the new
structure...

Migrating accounts:
  ⏳ Alice
  ⏳ Bob
  ⏳ Charlie

All accounts will be available on:
✓ Rubix Mainnet
✓ Rubix Testnet

Please wait...

        [Migrating... Please wait]
─────────────────────────────────────────
```

**Automatic Migration (No User Input Required):**

**Migration Steps:**
1. Detect old storage structure (version < 4.0)
2. Show migration loading screen
3. Get list of ALL existing accounts (from any old network)
4. For each account:
   - Call `register-did` API on **Rubix Mainnet default node** (reuse existing credentials)
   - Call `register-did` API on **Rubix Testnet default node** (reuse existing credentials)
   - Save account with both network-node mappings
5. Update storage version to 4.0
6. Navigate to dashboard on **Rubix Mainnet default node**

**Key Points:**
- ✅ ALL accounts migrated automatically (Rubix, Trie, any network)
- ✅ Each account registered on BOTH Rubix Mainnet AND Rubix Testnet
- ✅ NO user selection required - fully automatic
- ✅ Always land on Rubix Mainnet after migration
- ✅ User can immediately switch between Mainnet/Testnet without extra setup

**Migration Data Transformation:**

```javascript
// Old structure (single network)
{
  username: "Alice",
  network: 1, // Could be Rubix Mainnet, Testnet, Trie, etc.
  did: "did:rubix:alice123",
  publickey: "0xabc...",
  privatekey: "encrypted...",
  // ... other data
}

// New structure (multiple network-node mappings)
// Account now exists in BOTH networks with same credentials
[
  {
    username: "Alice",
    did: "did:rubix:alice123", // Same DID
    publickey: "0xabc...", // Same keys
    privatekey: "encrypted...",
    networkId: 1, // Rubix Mainnet
    nodeId: 1, // Default node
    nodeUrl: "https://mainnet-node1.rubix.network",
    swarmKey: "RUBIX_MAINNET_SWARM_KEY",
    // ... other data
  },
  {
    username: "Alice",
    did: "did:rubix:alice123", // Same DID
    publickey: "0xabc...", // Same keys
    privatekey: "encrypted...",
    networkId: 2, // Rubix Testnet
    nodeId: 1, // Default node
    nodeUrl: "https://testnet-node1.rubix.network",
    swarmKey: "RUBIX_TESTNET_SWARM_KEY",
    // ... other data
  }
]
```

**Migration Code Flow:**

```javascript
async function migrateToNetworkStructure() {
  // Get all old accounts
  const oldAccounts = await indexDBUtil.getData();

  // Get default nodes from config
  const rubixMainnetNode = config.NETWORKS[0].defaultNodes[0]; // Rubix Mainnet default
  const rubixTestnetNode = config.NETWORKS[1].defaultNodes[0]; // Rubix Testnet default

  for (const account of oldAccounts) {
    // Register on Rubix Mainnet
    await END_POINTS.register_did({
      did: account.did,
      publicKey: account.publickey,
      // other params
    });

    // Register on Rubix Testnet
    await END_POINTS.register_did({
      did: account.did,
      publicKey: account.publickey,
      // other params
    });

    // Save account with both network mappings
    await indexDBUtil.saveAccountNetworkBinding({
      username: account.username,
      did: account.did,
      publickey: account.publickey,
      privatekey: account.privatekey,
      networks: [
        {
          networkId: 1,
          nodeId: 1,
          nodeUrl: rubixMainnetNode.url,
          swarmKey: rubixMainnetNode.swarmKey
        },
        {
          networkId: 2,
          nodeId: 1,
          nodeUrl: rubixTestnetNode.url,
          swarmKey: rubixTestnetNode.swarmKey
        }
      ]
    });
  }

  // Update storage version
  await indexDBUtil.setStorageVersion('4.0');

  // Set current user to Rubix Mainnet default
  await setCurrentNetwork(1, 1); // networkId: 1, nodeId: 1
}
```

---

## API Requirements

### 1. Register DID on Node ✅ EXISTS
**Endpoint:** `POST {nodeUrl}/api/register-did`

**Already implemented in:** `src/api/endpoints.js` line 5-7

**Purpose:** Register existing DID on a new node (reuses credentials)

**Request:**
```json
{
  "did": "did:rubix:alice123",
  "publicKey": "0xabc...",
  // other required fields
}
```

**Response:**
```json
{
  "status": true,
  "result": {
    "id": "123",
    "hash": "0xabc..."
  }
}
```

**Usage:**
- When switching account to node where it doesn't exist
- When adding custom node and registering account on it
- When adding custom network and registering account on it

**This is the ONLY API needed for the network restructure feature!**

---

### 2. Get Swarm Key from Node 🔧 PLACEHOLDER
**Endpoint:** `GET {nodeUrl}/api/swarm-key` or similar

**Purpose:** Verify custom node belongs to correct network

**Request:**
```javascript
GET https://custom-node.rubix.com/api/swarm-key
```

**Response:**
```json
{
  "status": true,
  "swarmKey": "0x123abc..."
}
```

**Usage:**
- When adding custom node to Rubix Mainnet/Testnet
- Compare returned swarm key with network's swarm key

**Status:** Will implement with placeholder for now

**Placeholder Implementation:**
```javascript
// src/utils/nodeVerification.js
export async function getNodeSwarmKey(nodeUrl) {
  // TODO: Implement actual API call when endpoint is ready
  // For now, return placeholder that allows all nodes
  return {
    valid: true,
    swarmKey: "PLACEHOLDER_SWARM_KEY"
  };
}

export async function verifyNodeSwarmKey(nodeUrl, expectedSwarmKey) {
  try {
    const result = await getNodeSwarmKey(nodeUrl);

    // TODO: Uncomment when actual API is ready
    // if (result.swarmKey !== expectedSwarmKey) {
    //   return {
    //     valid: false,
    //     error: 'Swarm key mismatch',
    //     expected: expectedSwarmKey,
    //     received: result.swarmKey
    //   };
    // }

    return {
      valid: true,
      swarmKey: result.swarmKey
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to connect to node'
    };
  }
}
```

---

### 3. Check Account Exists in Network
**Option A: Local Check (IndexedDB)** ✅ RECOMMENDED
```javascript
async function checkAccountExistsInNetwork(username, networkId) {
  const accounts = await indexDBUtil.getData();
  return accounts.some(acc =>
    acc.username === username &&
    acc.networkId === networkId
  );
}
```

**Decision:** Use local IndexedDB check - faster and no API needed

---

### 4. Get Default Nodes Configuration ✅ EXISTS
**Endpoint:** Already exists: `https://assets.xellwallet.com/config.json`

**Add to config.json:**
```json
{
  "URLS": { ... },
  "NETWORKS": [
    {
      "id": 1,
      "name": "Rubix Mainnet",
      "swarmKey": "0x123abc...",
      "tokenSymbol": "RBT",
      "defaultNodes": [
        {
          "id": 1,
          "url": "https://node1.rubix.network",
          "name": "Rubix Node 1"
        },
        {
          "id": 2,
          "url": "https://node2.rubix.network",
          "name": "Rubix Node 2"
        }
      ]
    },
    {
      "id": 2,
      "name": "Rubix Testnet",
      "swarmKey": "0xdef456...",
      "tokenSymbol": "RBT",
      "defaultNodes": [
        {
          "id": 1,
          "url": "https://testnet-node1.rubix.network",
          "name": "Testnet Node 1"
        }
      ]
    }
  ]
}
```

**Usage:**
- Load on app startup
- Display default nodes in network selector
- Store swarm keys for validation

---

## Implementation Phases

### Phase 1: Update Data Structures & Storage
**Files to modify:**
- `src/indexDB/index.js` - Add new storage functions
- `config.js` - Update network configuration structure

**Tasks:**
1. Create new IndexedDB schema for networks with nodes
2. Add functions:
   - `getNetworksBySwarmKey(swarmKey)`
   - `getNodesByNetworkId(networkId)`
   - `addNodeToNetwork(networkId, node)`
   - `checkAccountInNetwork(username, networkId)`
   - `getAccountsByNetwork(networkId)`
3. Update config.json structure to include networks + nodes

**Storage Functions Needed:**

```javascript
// Get all networks with their nodes
async getNetworks() {
  // Returns all networks (Rubix Mainnet, Testnet, Custom)
}

// Get nodes for a specific network
async getNodesByNetworkId(networkId) {
  // Returns all nodes in that network
}

// Add custom node to network
async addNodeToNetwork(networkId, nodeData) {
  // Adds node to network's node list
  // Validates swarm key for Rubix networks
}

// Check if account exists in network
async checkAccountInNetwork(username, networkId) {
  // Returns true if account exists in any node of this network
}

// Get account's network and node info
async getAccountNetworkInfo(username) {
  // Returns { networkId, nodeId, nodeUrl, swarmKey }
}

// Add custom network
async addCustomNetwork(networkData) {
  // Adds user-defined network with swarm key + nodes
}
```

---

### Phase 2: Create UI Components
**New Components:**
1. `NetworkNodeSelector.jsx` - Select network and node
2. `AddCustomNodeModal.jsx` - Add custom node with swarm verification
3. `AddCustomNetworkModal.jsx` - Add custom network
4. `NetworkMigrationScreen.jsx` - Migration UI for existing users
5. `NodeVerification.jsx` - Swarm key verification UI

**Component Details:**

#### NetworkNodeSelector.jsx
```jsx
// Shows hierarchical view:
// Rubix Mainnet
//   └─ Node 1 (Your account: Alice)
//   └─ Node 2
//   └─ Add Node...
// Rubix Testnet
//   └─ Testnet Node 1
//   └─ Add Node...
// Custom Networks
//   └─ Add Network...

<NetworkNodeSelector
  onSelect={(network, node) => {}}
  currentAccount={username}
  mode="create|switch" // Different UI for create vs switch
/>
```

#### AddCustomNodeModal.jsx
```jsx
<AddCustomNodeModal
  networkId={1} // Rubix Mainnet
  networkSwarmKey="0x123abc..."
  onNodeAdded={(node) => {}}
/>

// Steps:
// 1. Enter node URL
// 2. Fetch swarm key from node
// 3. Verify match
// 4. Add if valid
```

#### NetworkMigrationScreen.jsx
```jsx
<NetworkMigrationScreen
  accounts={oldAccounts}
  defaultNodes={rubixMainnetNodes}
  onMigrate={(migrations) => {
    // migrations: [{ username, targetNodeId }, ...]
  }}
/>
```

---

### Phase 3: Update Account Creation Flow
**Files to modify:**
- `src/pages/SetupWallet.jsx`
- `src/components/setup/SetupUsername.jsx`

**New Steps:**
1. Username → PIN → Confirm PIN
2. **NEW: Select Network** (Rubix Mainnet/Testnet/Custom)
3. **NEW: Select/Add Node** within that network
4. Verify no duplicate in network
5. Recovery phrase → Create account on selected node

**Updated SetupWallet Flow:**

```jsx
// Add new steps
const [selectedNetwork, setSelectedNetwork] = useState(null);
const [selectedNode, setSelectedNode] = useState(null);

// Step 4: Network Selection
{step === 4 && (
  <NetworkSelection
    onSelect={(network) => {
      setSelectedNetwork(network);
      setStep(5);
    }}
  />
)}

// Step 5: Node Selection
{step === 5 && (
  <NodeSelection
    network={selectedNetwork}
    onSelect={(node) => {
      setSelectedNode(node);
      setStep(6);
    }}
    onAddNode={() => {/* Show add node modal */}}
  />
)}

// Step 6: Continue to recovery phrase...
```

---

### Phase 4: Update Network Switching
**Files to modify:**
- `src/components/network/NetworkSwitcher.jsx`
- `src/components/network/NetworkSelector.jsx`

**Changes:**
1. Show networks with nested nodes
2. Display current account's node
3. Allow switching between networks+nodes
4. Show "Create account" option for nodes without account

**Updated UI:**
```
┌─────────────────────────────────┐
│  Select Network & Node          │
├─────────────────────────────────┤
│ 🌐 Rubix Mainnet               │
│   ├─ 📍 Node 1 (Alice) ✓       │ ← Current
│   ├─ 📍 Node 2 (Bob)            │
│   ├─ 📍 Custom Node             │
│   └─ ➕ Add Node                │
│                                  │
│ 🧪 Rubix Testnet                │
│   ├─ 📍 Testnet Node 1 (Alice)  │
│   └─ ➕ Add Node                │
│                                  │
│ ⚙️  Custom Networks              │
│   ├─ My Network > Node A        │
│   └─ ➕ Add Network              │
└─────────────────────────────────┘
```

---

### Phase 5: Implement Migration
**Files to create:**
- `src/pages/migration/NetworkMigration.jsx`
- `src/indexDB/migration.js`

**Migration Logic:**

```javascript
// Check if migration needed
async function needsNetworkMigration() {
  const version = await indexDBUtil.getStorageVersion();
  return parseFloat(version) < 4.0;
}

// Migrate all accounts
async function migrateToNetworkStructure(nodeMappings) {
  // nodeMappings: { username: nodeId }

  const accounts = await indexDBUtil.getData();

  for (const account of accounts) {
    const targetNodeId = nodeMappings[account.username];
    const node = await getNodeById(targetNodeId);

    // Update account
    await indexDBUtil.updateAccount(account.username, {
      networkId: 1, // Rubix Mainnet
      nodeId: node.id,
      nodeUrl: node.url,
      swarmKey: node.swarmKey
    });
  }

  // Update storage version
  await indexDBUtil.setStorageVersion('4.0');
}
```

**Migration Screen Flow:**
1. App startup → Check storage version
2. If < 4.0 → Show NetworkMigration screen
3. Load all accounts
4. Show node selection for each account
5. User selects nodes → Click "Migrate"
6. Migrate accounts + update version
7. Navigate to dashboard

---

### Phase 6: Add Custom Node/Network Features
**Files to create:**
- `src/components/network/AddNodeModal.jsx`
- `src/components/network/AddNetworkModal.jsx`
- `src/utils/nodeVerification.js`

**Swarm Key Verification Utility:**

```javascript
// src/utils/nodeVerification.js

export async function verifyNodeSwarmKey(nodeUrl, expectedSwarmKey) {
  try {
    // Call node API to get swarm key
    const response = await fetch(`${nodeUrl}/api/swarm-key`);
    const data = await response.json();

    if (!data.status || !data.swarmKey) {
      return {
        valid: false,
        error: 'Failed to fetch swarm key from node'
      };
    }

    // Compare swarm keys
    if (data.swarmKey !== expectedSwarmKey) {
      return {
        valid: false,
        error: 'Swarm key mismatch',
        expected: expectedSwarmKey,
        received: data.swarmKey
      };
    }

    return {
      valid: true,
      swarmKey: data.swarmKey
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to connect to node'
    };
  }
}
```

**Add Node Flow:**
```jsx
// AddNodeModal.jsx
const handleAddNode = async () => {
  // 1. Validate URL format
  if (!isValidUrl(nodeUrl)) {
    setError('Invalid URL format');
    return;
  }

  // 2. Verify swarm key
  setVerifying(true);
  const result = await verifyNodeSwarmKey(nodeUrl, network.swarmKey);
  setVerifying(false);

  // 3. Show result
  if (!result.valid) {
    setError(result.error);
    return;
  }

  // 4. Add node to network
  await indexDBUtil.addNodeToNetwork(network.id, {
    url: nodeUrl,
    name: nodeName,
    swarmKey: result.swarmKey,
    isDefault: false
  });

  toast.success('Node added successfully');
  onClose();
};
```

---

### Phase 7: Update Account Switcher
**Files to modify:**
- `src/components/dashboard/Header.jsx`

**Changes:**
1. Show current account with network + node info
2. List all accounts grouped by network
3. Show "Create account on X node" for available nodes

**Updated Dropdown:**
```jsx
<AccountSwitcher>
  {/* Current Account */}
  <div className="current-account">
    Alice @ Rubix Mainnet (Node 1) ✓
  </div>

  {/* Other Accounts */}
  <div className="accounts-list">
    <div className="network-group">
      <h4>Rubix Mainnet</h4>
      - Alice (Node 1) ✓ Current
      - Bob (Node 2)
      - Create on Node 3...
    </div>

    <div className="network-group">
      <h4>Rubix Testnet</h4>
      - Alice (Testnet Node 1)
      - Create on Testnet Node 2...
    </div>
  </div>

  {/* Actions */}
  <div className="actions">
    + Create Wallet
    + Import Wallet
  </div>
</AccountSwitcher>
```

---

### Phase 8: Testing & Edge Cases

**Test Cases:**

1. **Account Creation:**
   - ✅ Create account on Rubix Mainnet Node 1
   - ✅ Try creating same account on Rubix Mainnet Node 2 → Should fail
   - ✅ Create same account on Rubix Testnet → Should succeed
   - ✅ Create account on custom network

2. **Node Addition:**
   - ✅ Add custom node to Rubix Mainnet with correct swarm key → Success
   - ✅ Add custom node with wrong swarm key → Should fail
   - ✅ Add node with invalid URL → Should fail

3. **Migration:**
   - ✅ Migrate account from Trie Mainnet to Rubix Mainnet
   - ✅ Multiple accounts migration
   - ✅ User cancels migration → Should stay on old version

4. **Network Switching:**
   - ✅ Switch from Node 1 to Node 2 (different accounts)
   - ✅ Switch between networks
   - ✅ Handle network errors gracefully

5. **Edge Cases:**
   - ❌ Node becomes unavailable
   - ❌ Swarm key verification times out
   - ❌ Duplicate account creation attempt
   - ❌ Invalid swarm key format

---

## Breaking Changes & Backward Compatibility

### Breaking Changes:
1. **Storage structure completely changed**
   - Old: Account → Network (1-4)
   - New: Account → Network → Node

2. **Network IDs changed**
   - Old: 1=Rubix Mainnet, 2=Rubix Testnet, 3=Trie Testnet, 4=Trie Mainnet
   - New: 1=Rubix Mainnet, 2=Rubix Testnet, 3+=Custom Networks

3. **Trie networks removed**
   - All accounts migrated to Rubix Mainnet

### Migration Required:
- All existing users MUST go through migration
- Cannot skip migration (forced flow)
- Storage version bump: 3.1 → 4.0

### Rollback Plan:
- Keep backup of old storage structure
- If migration fails, restore from backup
- Log all migration steps for debugging

---

## File Changes Summary

### New Files:
```
src/
  components/
    network/
      NetworkNodeSelector.jsx          [NEW]
      AddCustomNodeModal.jsx           [NEW]
      AddCustomNetworkModal.jsx        [NEW]
      NodeVerification.jsx             [NEW]
  pages/
    migration/
      NetworkMigration.jsx             [NEW]
  indexDB/
    migration.js                       [NEW]
  utils/
    nodeVerification.js                [NEW]
```

### Modified Files:
```
src/
  components/
    network/
      NetworkSwitcher.jsx              [MODIFY]
      NetworkSelector.jsx              [MODIFY]
    dashboard/
      Header.jsx                       [MODIFY]
  pages/
    SetupWallet.jsx                    [MODIFY]
  indexDB/
    index.js                           [MODIFY]
  config.js                            [MODIFY]
```

### Removed Files:
```
None (old Trie network code can be cleaned up later)
```

---

## Configuration Changes

### config.json Updates:

**Before:**
```json
{
  "URLS": {
    "RUBIX_MAINNET_BASE_URL": "https://node1.rubix.com",
    "RUBIX_TESTNET_BASE_URL": "https://testnet.rubix.com",
    "TRIE_MAINNET_BASE_URL": "https://trie.network",
    "TRIE_TESTNET_BASE_URL": "https://testnet.trie.network"
  }
}
```

**After:**
```json
{
  "URLS": {
    "RUBIX_MAINNET_BASE_URL": "https://node1.rubix.com",
    "RUBIX_TESTNET_BASE_URL": "https://testnet.rubix.com"
  },
  "NETWORKS": [
    {
      "id": 1,
      "name": "Rubix Mainnet",
      "swarmKey": "0xRUBIX_MAINNET_SWARM_KEY",
      "tokenSymbol": "RBT",
      "defaultNodes": [
        {
          "id": 1,
          "url": "https://node1.rubix.network",
          "name": "Official Node 1",
          "isDefault": true
        },
        {
          "id": 2,
          "url": "https://node2.rubix.network",
          "name": "Official Node 2",
          "isDefault": true
        }
      ]
    },
    {
      "id": 2,
      "name": "Rubix Testnet",
      "swarmKey": "0xRUBIX_TESTNET_SWARM_KEY",
      "tokenSymbol": "RBT",
      "defaultNodes": [
        {
          "id": 1,
          "url": "https://testnet-node1.rubix.network",
          "name": "Testnet Official Node",
          "isDefault": true
        }
      ]
    }
  ]
}
```

---

## Timeline Estimate

### Phase 1: Data Structures (3-4 days)
- Update IndexedDB schema
- Create storage functions
- Update config structure
- Write tests for storage functions

### Phase 2: UI Components (4-5 days)
- NetworkNodeSelector component
- AddCustomNodeModal component
- AddCustomNetworkModal component
- NodeVerification component
- NetworkMigrationScreen component

### Phase 3: Account Creation Flow (2-3 days)
- Update SetupWallet steps
- Add network selection step
- Add node selection step
- Duplicate prevention logic

### Phase 4: Network Switching (2-3 days)
- Update NetworkSwitcher
- Update NetworkSelector
- Hierarchical network-node display

### Phase 5: Migration (3-4 days)
- Migration detection
- Migration UI
- Migration logic
- Data transformation
- Testing migration scenarios

### Phase 6: Custom Node/Network (2-3 days)
- Add node modal
- Add network modal
- Swarm key verification
- Error handling

### Phase 7: Account Switcher (1-2 days)
- Update dropdown
- Show network+node info
- Add account creation options

### Phase 8: Testing & Polish (3-4 days)
- Unit tests
- Integration tests
- Edge case handling
- UI/UX polish
- Documentation

**Total: ~20-28 days (4-6 weeks)**

---

## Success Metrics

### Migration Success:
- ✅ 100% of existing accounts migrated without data loss
- ✅ Users can access their funds immediately after migration
- ✅ No duplicate accounts created during migration

### Feature Completeness:
- ✅ Users can create accounts on any node within a network
- ✅ Users can add custom nodes to Rubix networks
- ✅ Users can create custom networks with their own swarm keys
- ✅ Swarm key verification works correctly
- ✅ Account switching works seamlessly

### User Experience:
- ✅ Migration takes < 2 minutes
- ✅ Network switching is instant
- ✅ Clear error messages for all failure cases
- ✅ Intuitive UI for network-node selection

---

## Open Questions & Decisions Needed

### 1. API Endpoints
- ✅ `/api/register-did` endpoint EXISTS in codebase (src/api/endpoints.js)
- ❓ Do we have `/api/swarm-key` endpoint on nodes? (need to verify)
- ❓ Should we create swarm-key endpoint if it doesn't exist?

### 2. Node Validation
- ❓ Should we ping nodes to check they're online before adding?
- ❓ Should we periodically check node health?
- ❓ What happens if a node goes offline?

### 3. Migration Strategy
- ❓ Should we allow users to skip migration (and use old version)?
- ✅ Should all Trie accounts go to same Rubix node, or let user choose?
  - **Decision**: Let user choose per account

### 4. Custom Networks
- ❓ Should we validate swarm key format?
- ❓ Should we limit number of custom networks?
- ❓ Should custom networks be synced across devices?

### 5. Network Display
- ❓ Should we show node status (online/offline) in UI?
- ❓ Should we show number of accounts per node?
- ❓ Should we recommend nodes based on performance?

### 6. Confirmed Decisions ✅
- **Account switching**: No PIN prompt (respects auto-lock timeout)
- **Node creation during switch**: Show modal → Verify → Create → Switch → Dashboard
- **Multiple accounts per node**: Allowed (Node 1 can have Alice, Bob, etc.)
- **After network selection**: Immediate switch to dashboard (no confirmation screen)
- **Credential reuse**: Same DID, public key, private key are REUSED when registering account on new nodes (not creating new credentials)
- **Migration**: Automatic migration - ALL existing accounts registered on BOTH Rubix Mainnet AND Rubix Testnet default nodes
- **Migration landing**: Always land on Rubix Mainnet default node after migration
- **Swarm key API**: Use placeholder that allows all nodes until actual API endpoint is ready

---

## Risk Assessment

### High Risk:
- 🔴 **Data Loss During Migration**: Critical - implement backup/restore
- 🔴 **Incompatible Node APIs**: Critical - verify all nodes support required endpoints

### Medium Risk:
- 🟡 **Swarm Key Verification Failure**: Important - implement retry logic
- 🟡 **Node Unavailability**: Important - handle gracefully with fallbacks

### Low Risk:
- 🟢 **UI/UX Confusion**: Can be improved iteratively
- 🟢 **Performance Issues**: Unlikely with current design

### Mitigation Strategies:
1. **Data Loss**:
   - Backup before migration
   - Atomic transactions
   - Rollback on error
2. **API Issues**:
   - Verify endpoints early
   - Provide fallback options
   - Clear error messages
3. **Node Failures**:
   - Cache swarm keys
   - Retry with exponential backoff
   - Show offline status

---

## Appendix

### A. Example Network Configurations

**Rubix Mainnet:**
```javascript
{
  id: 1,
  name: "Rubix Mainnet",
  swarmKey: "0x1234567890abcdef",
  tokenSymbol: "RBT",
  nodes: [
    {
      id: 1,
      url: "https://node1.rubix.network",
      name: "Official Node 1",
      isDefault: true,
      selected: false,
      status: "online"
    },
    {
      id: 2,
      url: "https://my-node.example.com",
      name: "My Custom Node",
      isDefault: false,
      selected: true,
      status: "online"
    }
  ]
}
```

**Custom Network:**
```javascript
{
  id: 3,
  name: "My Private Network",
  swarmKey: "0xfedcba0987654321",
  tokenSymbol: "CUSTOM",
  nodes: [
    {
      id: 1,
      url: "https://private-node.mycompany.com",
      name: "Company Node",
      isDefault: true,
      selected: true,
      status: "online"
    }
  ]
}
```

### B. Example Account Bindings

**Account with Multiple Networks:**
```javascript
{
  username: "Alice",
  accounts: [
    {
      networkId: 1, // Rubix Mainnet
      nodeId: 1,
      nodeUrl: "https://node1.rubix.network",
      swarmKey: "0x1234567890abcdef",
      did: "did:rubix:alice_mainnet",
      publickey: "...",
      privatekey: "..." // encrypted
    },
    {
      networkId: 2, // Rubix Testnet
      nodeId: 1,
      nodeUrl: "https://testnet-node1.rubix.network",
      swarmKey: "0xabcdef1234567890",
      did: "did:rubix:alice_testnet",
      publickey: "...",
      privatekey: "..." // encrypted
    }
  ]
}
```

### C. Error Messages

**Duplicate Account:**
```
"Account 'Alice' already exists in Rubix Mainnet network. You cannot create the same account twice in the same network. Please choose a different username or create this account in a different network."
```

**Swarm Key Mismatch:**
```
"This node belongs to a different network.

Expected Swarm Key: 0x1234...abcd
Received Swarm Key: 0xfeed...beef

Please verify the node URL and try again."
```

**Node Offline:**
```
"Unable to connect to node at https://node.example.com

Please check:
- Node URL is correct
- Node is online and accessible
- Your internet connection is working
```

---

## Next Steps

1. **Review this document** with the team
2. **Answer open questions** in section above
3. **Verify API availability** - check if nodes have required endpoints
4. **Get swarm keys** for Rubix Mainnet and Testnet
5. **Update config.json** with default nodes
6. **Start implementation** following phases outlined above

---

*Document Version: 1.0*
*Last Updated: 2025*
*Author: Claude Code Implementation Plan*
