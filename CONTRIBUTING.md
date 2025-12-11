# Contributing to AI SaaS Platform

Thank you for your interest in contributing! This guide will help you understand how to contribute effectively.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

### Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/your-username/ai-saas-platform.git
cd ai-saas-platform
git remote add upstream https://github.com/ibrsaiaika/ai-saas-platform.git
```

### Set Up Development Environment

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Set up environment
cp .env.example .env.local
```

### Start Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages

### Commit Messages

```
feat: Add new feature
fix: Fix a bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Add tests for new features
4. Update documentation
5. Commit with clear messages
6. Push: `git push origin feature/your-feature`
7. Create Pull Request with description

### Testing

Before submitting a PR, ensure:

```bash
# Run linting
npm run lint

# Run tests
npm test

# Check types
npm run type-check
```

## Areas for Contribution

- **Bug Fixes**: Report issues in GitHub Issues
- **Features**: Check roadmap in README
- **Documentation**: Improve guides and examples
- **Performance**: Optimize existing code
- **Security**: Report issues responsibly

## Reporting Issues

Include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)

## Questions?

- Open a GitHub Discussion
- Check existing Issues and PRs
- Review documentation

---

Thank you for contributing! 🚀
