# MCP gateway

The gateway uses the official TypeScript SDK v2. Registered tools include explicit schemas, permissions, mode, risk, and approval policy. All calls pass through the shared `ToolRegistry`, so a protocol client receives the same policy decisions as REST and workflow callers.

The vertical agent runtime invokes the same registry used by MCP before the provider receives tool output. A public MCP transport remains intentionally unavailable until OAuth resource-server enforcement is attached.
