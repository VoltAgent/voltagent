# Add Custom Endpoints Feature

## Description

This PR adds a new feature to VoltAgent that allows developers to extend the VoltAgent API server with their own custom endpoints. This feature enables developers to build specialized functionality on top of the core framework without having to run a separate server.

## Features

- Add custom endpoints during VoltAgent initialization
- Register custom endpoints after the server has started
- Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- Type-safe endpoint definitions with validation
- Proper error handling and middleware integration
- Comprehensive documentation and examples

## Implementation Details

- Added `custom-endpoints.ts` with types and validation for custom endpoints
- Extended the API server to support registering custom endpoints
- Updated the VoltAgent class to accept custom endpoints in the constructor and provide methods to register endpoints after initialization
- Added tests for the custom endpoints feature
- Created examples demonstrating how to use custom endpoints
- Added documentation for the feature

## Examples

The PR includes three examples:

1. **Basic Custom Endpoints**: A simple example of adding custom endpoints to VoltAgent.
2. **Standalone Application**: A complete standalone application with custom endpoints.
3. **Express Integration**: An example of integrating VoltAgent with an Express application.

## Documentation

Added comprehensive documentation for the custom endpoints feature, including:

- Types and interfaces
- Usage examples
- Error handling
- Integration with existing applications

## Testing

Added tests for:

- Custom endpoint validation
- API server integration
- VoltAgent class integration

## Checklist

- [x] Added new feature
- [x] Added tests
- [x] Added documentation
- [x] Added examples
- [x] Tested the feature
- [x] Updated README.md

## Related Issues

This PR addresses the need for custom endpoints in VoltAgent, which has been requested by users who want to extend the API server with their own functionality without having to run a separate server.
