# Task Completion Checklist

## Mandatory Steps After ANY Code Changes

### 1. Code Quality Checks (REQUIRED)
```bash
npm run lint              # ESLint - must pass
npm run typecheck         # TypeScript - must pass  
npm run format            # Prettier formatting
```

### 2. Functionality Verification
```bash
npm run build             # Verify all 38 tools still work
# OR for specific modules:
npm run dev:core          # Test Core module
npm run dev:agile         # Test Agile module  
npm run dev:search        # Test Search module
```

### 3. Testing (if functionality changed)
```bash
npm test                  # Full test suite
npm run test:coverage     # Ensure 90% coverage maintained
```

### 4. Module Integration Test
```bash
npm run test:modules      # Test all modules work together
```

## Special Guidelines

### For API Changes
- Verify endpoint compatibility with DC vs Cloud
- Test PAT authentication still works
- Check error handling for DC-specific responses

### For Module Changes  
- Ensure module can still initialize independently
- Verify tool count remains at 38 total
- Test module-specific entry points work

### For Configuration Changes
- Validate with Zod schemas
- Test with different DC instance configurations
- Verify backward compatibility

### For Build/Deployment Changes
- Test TSX runtime execution
- Verify production deployment works
- Check all bin entries in package.json

## Quality Gates
- **ESLint**: Must pass without errors
- **TypeScript**: Must compile without errors
- **Tests**: Must maintain 90% coverage
- **Build**: All 38 tools must remain operational
- **Integration**: All modules must work independently and together

## Documentation Updates
- Update relevant docs/ files if API changes
- Update tool count if tools added/removed
- Update compatibility notes if DC behavior changes