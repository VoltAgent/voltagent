package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type DeleteCustomerParams struct {
	CustomerID string `json:"customerId" jsonschema:"Customer ID to delete"`
}

func deleteCustomer(
	ctx context.Context,
	req *mcp.CallToolRequest,
	params DeleteCustomerParams,
) (*mcp.CallToolResult, any, error) {
	schema := &jsonschema.Schema{
		Type:        "object",
		Description: "Confirm the deletion of the data.",
		Properties: map[string]*jsonschema.Schema{
			"confirm": {Type: "boolean", Description: "Confirm the deletion of the data."},
		},
		Required: []string{"confirm"},
	}

	result, err := req.Session.Elicit(ctx, &mcp.ElicitParams{
		// Intentionally blank to exercise client-side fallback to schema description.
		Message:         "",
		RequestedSchema: schema,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("eliciting failed: %w", err)
	}

	confirmed := false
	if result != nil && result.Action == "accept" {
		if value, ok := result.Content["confirm"]; ok {
			switch typed := value.(type) {
			case bool:
				confirmed = typed
			case string:
				confirmed = strings.EqualFold(strings.TrimSpace(typed), "yes")
			default:
				confirmed = strings.EqualFold(strings.TrimSpace(fmt.Sprint(value)), "yes")
			}
		}
	}

	message := fmt.Sprintf("Deletion cancelled for %s.", params.CustomerID)
	if confirmed {
		message = fmt.Sprintf("Customer %s deleted.", params.CustomerID)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: message},
		},
	}, nil, nil
}

func main() {
	host := flag.String("host", "127.0.0.1", "host to listen on")
	port := flag.Int("port", 3142, "port to listen on")
	flag.Parse()

	addr := fmt.Sprintf("%s:%d", *host, *port)

	server := mcp.NewServer(&mcp.Implementation{
		Name:    "go-elicitation-server",
		Version: "0.1.0",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "customer_delete",
		Description: "Delete a customer after user confirmation.",
	}, deleteCustomer)

	handler := mcp.NewStreamableHTTPHandler(func(_ *http.Request) *mcp.Server {
		return server
	}, nil)

	mux := http.NewServeMux()
	mux.Handle("/mcp", handler)

	log.Printf("MCP server listening on http://%s/mcp", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
