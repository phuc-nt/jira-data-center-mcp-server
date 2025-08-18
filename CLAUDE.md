## PHẦN 1: QUY TẮC CHUNG (Reusable across projects)

### Quy tắc cơ bản

- **Luôn sử dụng tiếng Anh để trả lời**
- Đọc project documentation trước khi bắt đầu bất kỳ task nào
- Tuân thủ workflow đã được định nghĩa trong project

### Git Commit Guidelines

- **Không sử dụng emoji** trong commit messages
- **Không thêm thông tin về Claude Code** hoặc AI tools trong commit message
- Sử dụng conventional commit format: `type: description`
- Ví dụ: `feat: add user authentication`, `fix: resolve memory leak in chat view`

---

## PHẦN 2: PROJECT RULES

### 📖 Workflow Khởi Động (Mỗi session)

1. **LUÔN chạy "read Serena's initial instructions"** - Kích hoạt Serena MCP cho semantic search và code analysis
2. **Đọc docs/START_POINT.md** - Hiểu project status và current focus, và tiếp tục đọc các tài liệu được liệt kê trong đó

### 🔄 Task Management Process

```yaml
Task Lifecycle:
  1. Identify task: Từ current sprint hoặc user request
  2. Focus mode: Làm từng task một, không jump around
  3. Update progress: Cập nhật sprint doc khi complete
  4. Commit clean: Clear commit message theo convention
  5. Update status: Cập nhật sprint document, và START_POINT.md và project_roadmap.md

Quality Gates:
  - Code compile: npm run build thành công
  - Tests pass: npm test pass (nếu có tests)
  - No token leaks: Không commit sensitive data
  - Documentation: Update docs
```

### 🎯 Documentation Rules

```yaml
Document Hierarchy:
  START_POINT.md: Central hub - overview only, link to details
  project_roadmap.md: Complete timeline, phases, results
  sprint_*.md: Detailed implementation tasks
  00_context/*.md: Technical specs, requirements, architecture

Update Rules:
  START_POINT.md: Major progress, phase completion
  project_roadmap.md: Phase completion, final results
  sprint_*.md: Daily progress updates
  Never: Requirements, architecture, security docs without approval

Maintenance Principles:
  - AVOID DUPLICATION: Link instead of repeat information
  - KEEP CONCISE: Overview docs stay short, details go in specific docs
  - SINGLE SOURCE OF TRUTH: Each piece of info lives in one place
  - CROSS-REFERENCE: Use links to connect related information
  - STATUS FIRST: Always show current status clearly

Writing Style:
  - Concise và actionable
  - Use status indicators: ✅ 🔄 📋 ❌
  - Include time estimates và actual time
  - Link related documents instead of duplicating content

Document Flow: START_POINT.md → project_roadmap.md → sprint_*.md → specific details
  Never put detailed task lists in overview documents
```

### 🤖 Serena MCP Integration

#### Kiểm tra Setup Serena

**Đầu tiên cần kiểm tra xem đã setup Serena cho project chưa:**
- Kiểm tra file `.serena/cache/` có tồn tại trong project không
- Chạy lệnh để xem Serena tools có khả dụng không

**Nếu chưa setup Serena cho project, cần thực hiện setup:**

#### Setup Serena cho Project Mới

1. **Cài đặt Serena cho project:**
```bash
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project $(pwd)
```

2. **Lập chỉ mục cho codebase:**
```bash
uvx --from git+https://github.com/oraios/serena index-project
```
⚠️ **Quan trọng:** Quá trình này sẽ tốn vài phút tùy vào kích thước project

3. **Kích hoạt Serena trong Claude Code:**
Chạy prompt: `read Serena's initial instructions`

#### Yêu cầu Sau Setup

```yaml
Setup Requirements:
  - Serena đã được cài đặt cho project này
  - Codebase đã được indexed với "uvx --from git+https://github.com/oraios/serena index-project"
  - Cache được lưu tại .serena/cache/

Session Activation:
  - BẮT BUỘC: Chạy "read Serena's initial instructions" mỗi session mới
  - Serena cung cấp semantic search và code analysis tools
  - Giúp tìm kiếm code theo ngữ nghĩa thay vì chỉ keyword matching

```

#### Lưu ý Quan trọng
- **Cài đặt theo từng project:** Serena cần được setup riêng cho mỗi project
- **Không cần cài lại uv:** Chỉ cần thực hiện 3 bước setup trên
- **Bảo mật và hiệu quả:** Mỗi project có index riêng biệt để tránh nhập nhằng dữ liệu