# Tech Stack and Dependencies

## Core Technologies
- **TypeScript 5.0+**: Strict mode with comprehensive type checking
- **Node.js**: >=18.0.0 (ESM modules)
- **TSX**: Runtime for direct TypeScript execution in production
- **MCP SDK**: @modelcontextprotocol/sdk v0.5.0 for protocol implementation
- **Zod**: Schema validation and type safety

## Development Tools
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting with specific style rules
- **Jest**: Testing framework with ts-jest and ESM support
- **TypeScript Compiler**: ES2022 target with strict type checking

## Build System
- **Custom Build**: `simple-build.cjs` for verification
- **TSX Runtime**: Direct TypeScript execution without compilation
- **ESM Support**: Full ES Module support throughout the project

## API Integration
- **Jira Data Center API**: v2/latest endpoints
- **Jira Agile API**: v1.0 (unchanged from Cloud)
- **HTTP Client**: Custom implementation with retry logic and circuit breaker

## Architecture Patterns
- **Modular Design**: 3 independent modules (Core, Agile, Search)
- **Dependency Injection**: Clean separation of concerns
- **Error Handling**: Centralized error mapping and user-friendly messages
- **Logging**: Structured logging with audit compliance and security masking