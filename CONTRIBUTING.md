# Contributing to CollectEVM

Thank you for considering contributing to the Wassieverse NFT Wallet Linker! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/CollectEVM.git
   cd CollectEVM
   ```

2. **Set up development environment**
   ```bash
   npm install
   cp env.example .env
   # Configure .env with your settings
   npx prisma generate
   npx prisma db push
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## Development Workflow

### Code Style

- Use TypeScript for all new files
- Follow existing code formatting
- Use meaningful variable/function names
- Add comments for complex logic
- Run linter before committing:
  ```bash
  npm run lint
  ```

### Component Guidelines

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props
- Add JSDoc comments for complex components

Example:
```typescript
interface MyComponentProps {
  /** The user's wallet address */
  address: string;
  /** Callback when operation completes */
  onComplete: (data: any) => void;
}

/**
 * Component for displaying user wallet information
 */
export function MyComponent({ address, onComplete }: MyComponentProps) {
  // Implementation
}
```

### API Route Guidelines

- Always validate input
- Handle errors gracefully
- Return consistent response format
- Use proper HTTP status codes
- Add JSDoc comments

Example:
```typescript
/**
 * POST /api/my-endpoint
 * Description of what this endpoint does
 */
export async function POST(req: NextRequest) {
  try {
    const { field } = await req.json();
    
    // Validation
    if (!field) {
      return NextResponse.json(
        { error: "Field is required" },
        { status: 400 }
      );
    }
    
    // Logic here
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Testing

### Manual Testing

Before submitting a PR, test:
1. Solana wallet connection
2. NFT verification
3. EVM wallet connection
4. Wallet linking
5. Error cases (no NFTs, cancelled signatures, etc.)

### Automated Tests (Future)

When adding tests:
- Place in `__tests__` directory
- Name files `*.test.ts` or `*.test.tsx`
- Cover both success and error cases

## Commit Messages

Use clear, descriptive commit messages:

### Format
```
type(scope): brief description

Longer description if needed

Fixes #123
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(api): add endpoint for wallet unlinking

fix(solana): handle edge case when NFT has no collection

docs(readme): update deployment instructions

refactor(components): extract common wallet logic to hook
```

## Pull Request Process

1. **Update documentation**
   - Update README.md if needed
   - Add comments to complex code
   - Update API docs if adding endpoints

2. **Test thoroughly**
   - Test on your local environment
   - Verify no TypeScript errors
   - Run linter

3. **Create PR**
   - Use clear title and description
   - Reference any related issues
   - Add screenshots for UI changes

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring
   
   ## Testing
   How was this tested?
   
   ## Screenshots (if applicable)
   
   ## Checklist
   - [ ] Code follows project style
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings or errors
   - [ ] Tested locally
   ```

## Areas for Contribution

### High Priority
- [ ] Add unit tests for API routes
- [ ] Implement caching for NFT queries
- [ ] Add rate limiting to API
- [ ] Improve error messages
- [ ] Add loading skeletons

### Features
- [ ] Support multiple NFT collections
- [ ] Add wallet unlinking
- [ ] Display NFT images from metadata
- [ ] Admin dashboard
- [ ] Export wallet links as CSV
- [ ] Email notifications
- [ ] Activity log/history

### UI/UX
- [ ] Dark mode improvements
- [ ] Mobile responsive design
- [ ] Add animations
- [ ] Accessibility improvements
- [ ] Internationalization (i18n)

### Performance
- [ ] Implement Redis caching
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Lazy load components
- [ ] Optimize bundle size

### Documentation
- [ ] Add video tutorial
- [ ] Create API documentation site
- [ ] Add more examples
- [ ] Troubleshooting guide
- [ ] Architecture diagrams

## Code Review Process

### What Reviewers Look For
- Code quality and style
- Security considerations
- Performance implications
- Error handling
- Documentation
- Test coverage

### Response Time
- We aim to review PRs within 3-5 days
- Complex PRs may take longer
- Feel free to ping if no response after 1 week

## Security

### Reporting Vulnerabilities
**Do not open public issues for security vulnerabilities.**

Instead:
1. Email security concerns to [your-email]
2. Include detailed description
3. Steps to reproduce if applicable
4. Your suggested fix (optional)

### Security Best Practices
- Never commit secrets or API keys
- Always validate and sanitize input
- Verify signatures server-side
- Use parameterized queries
- Keep dependencies updated

## Questions?

- Open a GitHub Discussion
- Check existing issues
- Review documentation
- Join our Discord (if applicable)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing! 🎉

