# Connector architecture

Connectors implement a lifecycle and tool execution contract. Local connectors initiate outbound connections; customer databases are never expected to accept public inbound traffic. Tool capabilities are configured explicitly and raw credentials do not enter model context.

The first database adapter will be PostgreSQL, read-only, with selected table/column discovery, statement timeouts, row limits, and generated controlled tools. Arbitrary model-generated SQL is outside the product boundary.
