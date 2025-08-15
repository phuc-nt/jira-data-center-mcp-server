# Essential Development Commands

## Daily Development Commands

### Build and Verification
```bash
npm run build              # Verify all 38 tools working (custom build script)
npm run build:verify       # Same as build
npm run typecheck          # TypeScript type checking only
```

### Development and Testing
```bash
npm run dev                # Run main server with TSX
npm run dev:agile          # Test Agile module only
npm run dev:core           # Test Core module only  
npm run dev:search         # Test Search module only
npm run test:modules       # Test all modules sequentially
```

### Code Quality (MUST RUN AFTER CHANGES)
```bash
npm run lint               # ESLint checking
npm run lint:fix           # Auto-fix ESLint issues
npm run format             # Prettier code formatting
npm run typecheck          # TypeScript compilation check
```

### Testing
```bash
npm test                   # Run full test suite (Jest)
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage report (90% threshold)
```

### Production
```bash
npm run start:production   # Production server with TSX runtime
npm run clean              # Clean dist directory
```

## System Commands (macOS)
- `ls` - List files
- `find` - Search files
- `grep` - Text search
- `git` - Version control

## Post-Task Checklist Commands
After completing any task, ALWAYS run:
1. `npm run lint` - Check code style
2. `npm run typecheck` - Verify TypeScript
3. `npm run test` - Run tests if changes affect functionality
4. `npm run build` - Verify all tools still work