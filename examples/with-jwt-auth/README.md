# VoltAgent JWT Authentication Example

This example demonstrates how to protect your VoltAgent endpoints with JWT authentication.

## Features

- JWT token verification for agent execution endpoints
- User context injection into agent operations
- Role-based access control
- Custom user mapping from JWT claims
- Tools that can access authenticated user information

## Protected Endpoints

When JWT authentication is enabled, the following endpoints require a valid token:

- `POST /agents/:id/text` - Generate text
- `POST /agents/:id/stream` - Stream text
- `POST /agents/:id/object` - Generate object
- `POST /agents/:id/stream-object` - Stream object
- `POST /workflows/:id/run` - Run workflow
- `POST /workflows/:id/stream` - Stream workflow

## Public Endpoints

These endpoints remain public (no auth required):

- `GET /agents` - List agents
- `GET /agents/:id` - Get agent details
- `GET /workflows` - List workflows
- `GET /workflows/:id` - Get workflow details
- `GET /logs` - Get logs
- `GET /` - Landing page
- `GET /doc` - API documentation
- `GET /ui` - Swagger UI

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set your JWT secret (optional):

```bash
export JWT_SECRET="your-secret-key"
```

## Running

```bash
npm run dev
```

The server will start and display example JWT tokens for testing.

## Testing

### With Authentication (Success)

```bash
# Get a token from the console output or create your own
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make an authenticated request
curl -X POST http://localhost:3141/agents/agent/text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "Who am I?"
  }'
```

### Without Authentication (Failure)

```bash
# This will return 401 Unauthorized
curl -X POST http://localhost:3141/agents/agent/text \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "Hello"
  }'
```

### Public Endpoints (No Auth Required)

```bash
# These work without authentication
curl http://localhost:3141/agents
curl http://localhost:3141/workflows
```

## How It Works

1. **JWT Provider**: The `jwtAuth` function creates an authentication provider that verifies JWT tokens.

2. **User Mapping**: The `mapUser` function transforms JWT claims into a user object:

   ```typescript
   mapUser: (payload) => ({
     id: payload.sub,
     email: payload.email,
     name: payload.name,
     role: payload.role,
   });
   ```

3. **Context Injection**: The authenticated user is automatically added to the agent's context:

   ```typescript
   const user = context.context.get("user");
   ```

4. **Role-Based Access**: You can implement custom logic based on user roles:
   ```typescript
   if (user.role === "admin") {
     // Admin-only operations
   }
   ```

## Integration with Auth Providers

### Auth0

```typescript
auth: jwtAuth({
  secret: process.env.AUTH0_SECRET,
  verifyOptions: {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  },
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    permissions: payload.permissions,
  }),
});
```

### Supabase

```typescript
auth: jwtAuth({
  secret: process.env.SUPABASE_JWT_SECRET,
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    metadata: payload.user_metadata,
  }),
});
```

### Clerk

```typescript
auth: jwtAuth({
  secret: process.env.CLERK_JWT_KEY,
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    firstName: payload.first_name,
    lastName: payload.last_name,
  }),
});
```

## Security Notes

1. **Always use environment variables** for JWT secrets in production
2. **Set appropriate token expiration** times
3. **Use HTTPS** in production to protect tokens in transit
4. **Validate token claims** like audience and issuer
5. **Implement token refresh** for long-running sessions

That's it! Your VoltAgent is now protected with JWT authentication. 🔐
