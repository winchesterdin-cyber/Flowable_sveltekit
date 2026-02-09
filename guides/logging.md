# Logging Conventions

## Goals
- Keep logs structured, consistent, and easy to search.
- Capture user-impacting actions, error states, and request lifecycles.
- Avoid logging secrets or sensitive data.

## Backend
- Use `StructuredLogger` for consistent `key=value` context formatting.
- Request lifecycle logging is handled by `RequestLoggingFilter`.
- Log errors with enough context to troubleshoot (IDs, status, timing).
- Avoid logging full payloads unless required for debugging.

### Example
```
Request start [method=POST, path=/api/tasks/123/complete, query=null, timestamp=...]
Request end [durationMs=120, method=POST, path=/api/tasks/123/complete, status=200]
```

## Frontend
- Use `createLogger('<ModuleName>')` to scope logs to features/components.
- Use `logger.event('<event-name>')` for user actions (save, submit, delete).
- Log errors with `logger.error(message, error, context)` to capture stack traces in dev.

### Example
```
[2026-02-09T21:04:14.898Z] [INFO] event:expense-submitted {"module":"ExpenseProcess","amount":100,"category":"Travel"}
```

## Severity Guidance
- `debug`: verbose internal details (dev only).
- `info`: expected operations and user actions.
- `warn`: recoverable or unexpected states.
- `error`: failed operations or exceptions.
