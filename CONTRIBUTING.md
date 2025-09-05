# Contributing to Xell Wallet

Thank you for your interest in contributing to Xell Wallet! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- A modern web browser (Chrome or Firefox)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/xell-wallet.git
   cd xell-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Load extension in browser** (see README.md for detailed instructions)

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

Example: `feature/add-transaction-history`

### Commit Messages

Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(wallet): add transaction history pagination

- Implement infinite scroll for transaction list
- Add loading states and error handling
- Update UI components for better performance

Closes #123
```

## Code Standards

### JavaScript/React

- Use ES6+ features
- Follow React best practices and hooks patterns
- Use functional components over class components
- Implement proper error boundaries
- Use TypeScript where beneficial

### Code Style

- Use ESLint configuration provided in the project
- Follow Prettier formatting rules
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### File Organization

```
src/
├── components/     # Reusable UI components
│   ├── common/    # Generic components
│   └── specific/  # Feature-specific components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── context/       # React context providers
├── api/           # API related code
└── assets/        # Static assets
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Write integration tests for components
- Test error scenarios and edge cases
- Mock external dependencies appropriately

### Test Structure

```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle expected behavior', () => {
    // Test implementation
  });

  it('should handle error cases', () => {
    // Error testing
  });
});
```

## Security Guidelines

### Sensitive Data

- Never commit private keys, passwords, or API keys
- Use environment variables for configuration
- Sanitize user inputs
- Validate all external data

### Browser Extension Security

- Follow browser extension security best practices
- Use Content Security Policy (CSP)
- Validate all message passing between scripts
- Implement proper permission handling

## Pull Request Process

### Before Submitting

1. **Test your changes**
   - Run the full test suite
   - Test in both Chrome and Firefox
   - Verify no console errors

2. **Code quality**
   - Run linting: `npm run lint`
   - Fix any linting errors
   - Ensure code follows project standards

3. **Documentation**
   - Update README.md if needed
   - Add/update JSDoc comments
   - Update CHANGELOG.md

### PR Requirements

- **Clear description**: Explain what changes were made and why
- **Issue reference**: Link to related issues
- **Screenshots**: Include UI changes screenshots
- **Testing**: Describe how changes were tested
- **Breaking changes**: Clearly mark any breaking changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Tested in Chrome
- [ ] Tested in Firefox

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## Issue Reporting

### Bug Reports

Use the bug report template and include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser and extension version
- Console errors (if any)
- Screenshots (if applicable)

### Feature Requests

Use the feature request template and include:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (if any)
- Alternative solutions considered

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Update manifest versions
4. Create release tag
5. Build and test extension packages
6. Submit to browser stores (if applicable)

## Community

### Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussions
- **Pull Requests**: Code contributions and reviews

### Getting Help

- Check existing issues and documentation first
- Use GitHub Discussions for questions
- Be respectful and patient when asking for help
- Provide context and details when seeking assistance

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for significant contributions
- README.md contributors section
- Release notes for major features

Thank you for contributing to Xell Wallet! 🚀