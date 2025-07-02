# PostgreSQL Integration Testing

This package now includes integration tests that run against a real PostgreSQL database using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Port 5433 available (used by test database)

## Running Tests

### Unit Tests (Default)

```bash
npm test
```

Runs unit tests with mocked database using vitest.

### Integration Tests

```bash
npm run test:integration
```

This will:

1. Start a PostgreSQL container using Docker Compose
2. Run integration tests against the real database
3. Clean up the container when done

### Manual Integration Test Setup

For development or debugging:

```bash
# Start test database
npm run test:integration:setup

# Run integration tests manually
vitest run --config vitest.integration.config.mts

# Clean up when done
npm run test:integration:teardown
```

## What Integration Tests Cover

- Real database operations (create, read, update, delete)
- SQL query validation and safety checks
- Error handling with actual database errors
- Storage limits enforcement
- User-scoped operations
- Transaction behavior

## Test Database Configuration

The integration tests use:

- **Host**: localhost
- **Port**: 5433
- **Database**: voltagent_test
- **User**: test
- **Password**: test
- **Table Prefix**: test_voltagent

## SQL Validation

The PostgreSQL storage now includes basic SQL validation to catch:

- Empty or invalid queries
- Dangerous SQL injection patterns
- Table prefix usage warnings

This validation is tested in both unit and integration tests.
