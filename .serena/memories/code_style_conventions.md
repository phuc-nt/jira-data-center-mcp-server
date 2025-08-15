# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022 with ESNext modules
- **Strict Mode**: Full strict TypeScript with all safety checks enabled
- **Additional Checks**: 
  - noImplicitAny, noImplicitThis, noImplicitReturns
  - noUnusedLocals, noUnusedParameters
  - exactOptionalPropertyTypes, noUncheckedIndexedAccess
  - noImplicitOverride

## ESLint Rules
- **Parser**: @typescript-eslint/parser with project type checking
- **Key Rules**:
  - prettier/prettier: error
  - @typescript-eslint/no-unused-vars: error
  - @typescript-eslint/no-explicit-any: warn
  - @typescript-eslint/explicit-function-return-type: warn
  - no-console: warn (use logger instead)
  - prefer-const: error, no-var: error

## Prettier Configuration
- **Semicolons**: Required (semi: true)
- **Quotes**: Single quotes (singleQuote: true)
- **Print Width**: 100 characters
- **Indentation**: 2 spaces (no tabs)
- **Trailing Commas**: ES5 style
- **Arrow Parens**: Avoid when possible
- **Line Endings**: LF

## Naming Conventions
- **Classes**: PascalCase (e.g., `CoreModule`, `DataCenterAPIClient`)
- **Functions/Methods**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE for module-level constants
- **Files**: kebab-case for files, PascalCase for class files
- **Interfaces/Types**: PascalCase with descriptive names

## Code Organization
- **Modules**: Organized by functionality (core, agile, search)
- **Exports**: Named exports preferred, default exports for main classes
- **Imports**: Grouped and ordered (external libs, internal modules, types)
- **Error Handling**: Always use typed errors with proper error mapping