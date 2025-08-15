# Project Structure

## Root Directory
```
/
├── docs/                   # Documentation and planning
├── src/                    # Source code
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest testing configuration
├── .eslintrc.json         # ESLint rules
├── .prettierrc            # Prettier formatting rules
├── simple-build.cjs       # Custom build verification script
└── PRODUCTION_DEPLOYMENT.md # Production deployment guide
```

## Source Code Structure (`src/`)
```
src/
├── config/                # Configuration management
│   └── datacenter-config.ts
├── auth/                  # Authentication (PAT)
│   └── pat-authenticator.ts
├── utils/                 # Shared utilities
│   ├── error-handler.ts
│   └── logger.ts
├── api/                   # API client layer
│   ├── datacenter-client.ts
│   ├── endpoint-mapper.ts
│   ├── content-converter.ts
│   ├── user-resolver.ts
│   ├── version-manager.ts
│   └── error-handler.ts
├── modules/               # Main business modules
│   ├── core/             # Core module (14 tools)
│   │   ├── index.ts      # CoreModule class
│   │   ├── types.ts      # Type definitions
│   │   ├── user-manager.ts
│   │   ├── project-manager.ts
│   │   ├── issue-manager.ts
│   │   └── issue-workflow.ts
│   ├── agile/            # Agile module (10 tools)
│   │   ├── index.ts      # AgileModule class
│   │   ├── types.ts
│   │   ├── board-manager.ts
│   │   ├── sprint-manager.ts
│   │   └── issue-operations.ts
│   └── search/           # Search module (14 tools)
│       ├── index.ts      # SearchModule class
│       ├── types.ts
│       ├── enhanced-search.ts
│       ├── epic-search.ts
│       └── universal-user-search.ts
└── __tests__/            # Test files
    ├── setup.ts          # Test configuration
    ├── config/           # Config tests
    ├── auth/             # Auth tests
    └── api/              # API tests
```

## Key Architecture Points
- **No main index.ts**: Project uses module-specific entry points
- **3 Independent Modules**: Each module can run standalone
- **Layered Architecture**: Config → Auth → API → Modules
- **Test Coverage**: Comprehensive tests with 90% coverage requirement