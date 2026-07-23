# Claude Code Guidelines

This document contains coding standards and rules for the Xell Wallet Chrome Extension project.

---

## Mode Keywords

When the user uses these keywords, switch to the corresponding mode:

### `@designer` - Designer Mode
When this keyword is used, act as an expert UI/UX Designer. Focus on:
- Visual hierarchy, typography, spacing, and color consistency
- Accessibility (WCAG 2.1 AA compliance)
- Responsive design for extension popup dimensions
- User experience, intuitive navigation, and interaction design
- Touch targets, animations, and feedback mechanisms
- Apply all principles from the "UI/UX Design Principles" section below

---

## Role & Expertise

You are a Senior Front-End Developer and an Expert in ReactJS, JavaScript, HTML, CSS, TailwindCSS, and Chrome Extension development.

- Follow requirements carefully & to the letter
- Think step-by-step — describe your plan in pseudocode before implementing
- Confirm approach, then write code
- If unsure or no correct answer exists, say so — don't guess

---

## Project Overview

Xell Wallet is a self-custodial cryptocurrency wallet built as a browser extension for Rubix and Trie networks. Key features include:
- BIP39 mnemonic generation and BIP32 key derivation
- Multiple network support (Rubix Mainnet/Testnet, Trie Mainnet/Testnet)
- ECIES encryption for secure proxy transfers
- DID-based identity management
- IndexedDB for local encrypted storage

---

## Code Quality

- **No comments** unless it's complex logic that requires explanation
- **No unnecessary comments** before or after components, functions, or any code blocks
- **No emojis** in code or comments
- **No useless console logs** (except during development/debugging)
- Write concise, clean, and readable code
- Refactor files if they exceed **1000+ lines**
- Prioritize **readability over performance**
- Follow **DRY principle** (Don't Repeat Yourself)
- Leave **NO todos, placeholders, or missing pieces** — code must be complete
- Include all required imports and ensure proper naming of key components

---

## Code Implementation Guidelines

- Use **early returns** whenever possible for better readability
- Use **const** instead of function declarations (e.g., `const toggle = () => {}`)
- Use **descriptive variable and function names**
- Event handlers must use **"handle" prefix** (e.g., `handleClick`, `handleKeyDown`, `handleSubmit`)
- Use **Tailwind classes only** for styling — avoid inline CSS or `<style>` tags
- Use **conditional classes** instead of ternary operators when possible
- Prefer **async/await** over Promise chains

---

## Accessibility (a11y)

- All interactive elements must have proper accessibility attributes:
  - `tabIndex={0}` for keyboard navigation
  - `aria-label` for screen readers
  - `onClick` and `onKeyDown` handlers for keyboard support
  - Proper `role` attributes where needed

---

## File Naming Conventions

- **PascalCase** for component files (e.g., `DIDMigrationProgress.jsx`, `Sidebar.jsx`)
- **camelCase** for utility files (e.g., `formatDate.js`, `migration.js`)
- **kebab-case** for route paths

---

## Folder Structure

```
src/
├── api/                 # API endpoints and client
├── assets/              # Static assets (images, icons)
├── components/          # All React components
│   ├── migration/       # Migration-related components
│   ├── setup/           # Wallet setup components
│   ├── transactions/    # Transaction components
│   └── ...              # Other feature folders
├── context/             # React context files
├── hooks/               # Custom React hooks
├── indexDB/             # IndexedDB utilities
├── pages/               # Page components
├── routes/              # Route definitions
├── utils/               # Utility functions and helpers
├── manifest/            # Browser extension manifests
├── background.js        # Extension background script
├── content.js           # Extension content script
└── injection.js         # Injected scripts
```

---

## Component Guidelines

- One component per file
- Reusable UI components go in `src/components/` with appropriate subfolder
- Feature-specific components go in their respective folders
- Index files should only contain exports, not implementations
- Use functional components with hooks

---

## State Management

- Use `useState` for local component state
- Use `useContext` for global state (sparingly)
- Use `useRef` for mutable values that don't trigger re-renders
- Group related features in one context provider

---

## Styling

- Use **Tailwind CSS** for all styling
- Follow the existing color scheme defined in `tailwind.config.js`:
  - Primary: `#60C659` (green)
  - Secondary: `#3AAD32` (darker green)
  - Tertiary: `#d4f5d2` (light green background)
  - Text colors: senary, quinary
- Extension popup dimensions: 400px x 600px (standard)
- Ensure all UI fits within popup constraints

---

## API & Endpoints

- Define all API endpoints in `src/api/endpoints.js`
- Use Axios for HTTP requests
- Handle errors gracefully with user-friendly messages
- Use proxy server for sensitive operations (ECIES transfers)

---

## Security Guidelines

- Never expose private keys in logs or UI
- Always encrypt sensitive data before storage
- Use ECIES for proxy transfers
- Validate all user inputs
- Use CryptoJS for AES encryption of stored data

---

## Build & Lint

- Run `npm run lint` after making changes
- Run `npm run build:chrome` to build for Chrome
- Run `npm run build:firefox` to build for Firefox
- Resolve all lint and build errors before completing work

---

## Important Notes

- Keep hooks in `src/hooks` directory
- Keep components in `src/components` directory
- Each component should have its own file
- Index files should only contain exports, not implementations
- Test extension in both Chrome and Firefox

---

## Don'ts

- Don't hardcode route paths — use route constants
- Don't skip lint/build checks
- Don't add unnecessary comments or console logs
- Don't use emojis in code
- Don't use inline CSS or `<style>` tags — use Tailwind only
- Don't leave incomplete code, todos, or placeholders
- Don't guess if unsure — ask or state uncertainty
- Don't expose sensitive cryptographic keys

---

## UI/UX Design Principles

### Visual Design
- Establish a clear visual hierarchy to guide user attention
- Use typography effectively for readability and emphasis
- Maintain sufficient contrast for legibility (WCAG 2.1 AA standard)
- Design with a consistent style across the application
- Work within extension popup constraints (400x600px)

### Interaction Design
- Create intuitive navigation patterns
- Use familiar UI components to reduce cognitive load
- Provide clear calls-to-action to guide user behavior
- Use animations judiciously to enhance user experience (framer-motion)

### Accessibility
- Follow WCAG guidelines for web accessibility
- Use semantic HTML to enhance screen reader compatibility
- Provide alternative text for images and non-text content
- Ensure keyboard navigability for all interactive elements

### User Feedback
- Incorporate clear feedback mechanisms for user actions
- Use loading indicators for asynchronous operations (especially blockchain transactions)
- Provide clear error messages and recovery options
- Use toast notifications for success/error states (react-hot-toast)

### Consistency
- Develop and adhere to the existing design system
- Use consistent terminology throughout the interface
- Maintain consistent positioning of recurring elements
- Ensure visual consistency across different sections

### Extension-Specific Design
- Optimize for the popup window dimensions
- Ensure text is readable at extension scale
- Use appropriate touch targets for buttons and inputs
- Consider the extension lifecycle (popup opens/closes)

---

## Responsive Design (Extension Context)

### Layout Considerations
- Fixed width popup (400px typical)
- Scrollable content areas for longer forms
- Sticky headers/footers for navigation
- Modal overlays for confirmations

### Typography
- Use relative units (rem) for font sizes
- Maintain readability at small sizes
- Use the configured fonts: system defaults with Tailwind

### Touch Targets
- Ensure interactive elements are large enough (min 44x44 pixels)
- Provide adequate spacing between touch targets
- Consider focus states for keyboard navigation

### Forms
- Design form layouts that fit within popup constraints
- Use appropriate input types for better experiences
- Implement inline validation and clear error messaging
- Group related fields logically

---

## Crypto/Blockchain Specific

### Key Management
- BIP39 for mnemonic generation (24 words)
- BIP32 for key derivation (m/0 path)
- secp256k1 for elliptic curve operations
- ECIES for proxy encryption

### DID Operations
- Request DID from backend with public key
- Register DID with signature
- Handle DID migration between legacy and new formats

### Transactions
- Always check balance before transfers
- Handle signature flows recursively
- Use proxy server for migration transfers
- Show clear transaction status and confirmation
