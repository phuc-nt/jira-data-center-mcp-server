# MCP Jira Data Center Server v1.0.0 - Project Hub

**Latest Achievement**: Initial Project Setup ✅ PREPARED - Documentation và Architecture chuẩn bị hoàn tất  
**Current Status**: Ready for development - 3-module architecture designed (38 tools)  
**Project Status**: v1.0.0-DC 📋 DEVELOPMENT READY - Migration Planning Complete

> **Quick Status**: Project Setup ✅ → Development Phase: PAT-only authentication với 3 specialized modules

---

## 📊 Current Status

### Phase 1 READY 🚀 (DOCUMENTATION & PLANNING COMPLETE)
**Duration:** August 14, 2025 (Planning phase complete)  
**Result:** Comprehensive migration strategy và architecture documentation ready

#### Architecture Targets:
```bash
# Planned Entry Points - v1.0.0-DC Development Ready:
mcp-jira-dc-server         # Main monolithic entry (38 tools) - backward compatibility
mcp-jira-dc-core           # Core module (14 tools) - Essential operations
mcp-jira-dc-agile          # Agile module (10 tools) - Sprint & Board management  
mcp-jira-dc-search         # Search module (14 tools) - Enhanced search & discovery
```

**Next Phase**: Implementation - Tool adaptation và PAT authentication integration

---

## 🗺️ Navigation Guide

### 🤖 For AI Assistants (5 phút context):

1. **[Project Requirements](00_context/project-requirement.md)** → Data Center-specific requirements và PAT authentication strategy
2. **[Implementation Details](00_context/implementation-detail.md)** → Technical architecture và migration approach từ Cloud
3. **[Tools Reference](00_context/tools_complete_list.md)** → Complete API mapping Cloud → Data Center cho 38 tools
4. **[Project Roadmap](01_preparation/project_roadmap.md)** → Development timeline và milestone planning

### 👨‍💻 For Developers (15 phút context):

1. **[Migration Strategy](../jira-cloud-mcp-server/docs/00_migrate/)** → Cloud vs Data Center differences analysis
2. **[API Comparison](../jira-cloud-mcp-server/docs/00_migrate/api-compare.md)** → Endpoint mapping và compatibility matrix
3. **[DC API Documentation](../jira-cloud-mcp-server/docs/00_migrate/dc-api-document.md)** → Complete Data Center API reference
4. **[Implementation Details](00_context/implementation-detail.md)** → Architecture decisions và technical approach

---

## 🎯 Project Overview

**MCP Jira Data Center Server v1.0.0-DC** - Specialized MCP server enabling AI assistants to interact with Jira Data Center/Server using Personal Access Token authentication với tools-only architecture.

**Tech Stack**: TypeScript, MCP Protocol, Jira Data Center API v2/latest + Agile API v1.0  
**Authentication**: Personal Access Token (PAT) only - simplicity and security focused  
**Architecture**: 3 specialized modules với 38 optimized tools  
**Target Status**: Development-ready với comprehensive migration plan

---

_Central project hub - Created August 14, 2025 with comprehensive migration planning_  
_Status: Development Ready - All planning phases complete, ready for implementation_