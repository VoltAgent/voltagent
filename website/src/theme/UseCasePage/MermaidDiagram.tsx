import Mermaid from "@theme/Mermaid";
import type React from "react";

interface MermaidDiagramProps {
  slug: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ slug }) => {
  const getAgentName = () => {
    switch (slug) {
      case "ai-research-assistant":
        return "Research Agent";
      case "customer-support-agent":
      case "b2b-customer-support":
      case "b2c-customer-service":
        return "Support Agent";
      case "code-review-assistant":
        return "Review Agent";
      case "sales-lead-qualification":
        return "Lead Agent";
      case "manufacturing-ops":
        return "Ops Agent";
      case "government-public-sector":
        return "Gov Agent";
      case "higher-education":
        return "Edu Agent";
      case "documentation-teams":
        return "Doc Agent";
      case "product-teams":
        return "Product Agent";
      case "marketing-teams":
        return "Marketing Agent";
      default:
        return "Agent";
    }
  };

  const getRequestType = () => {
    switch (slug) {
      case "ai-research-assistant":
        return "Research Request";
      case "customer-support-agent":
      case "b2b-customer-support":
      case "b2c-customer-service":
        return "Support Ticket";
      case "code-review-assistant":
        return "Code PR";
      case "sales-lead-qualification":
        return "Lead Data";
      case "manufacturing-ops":
        return "Sensor Data";
      case "government-public-sector":
        return "Citizen Request";
      case "higher-education":
        return "Student Query";
      case "documentation-teams":
        return "Doc Request";
      case "product-teams":
        return "Product Data";
      case "marketing-teams":
        return "Campaign Data";
      default:
        return "Request";
    }
  };

  const getToolAction = () => {
    switch (slug) {
      case "ai-research-assistant":
        return "Search & RAG";
      case "customer-support-agent":
      case "b2b-customer-support":
      case "b2c-customer-service":
        return "KB Query";
      case "code-review-assistant":
        return "Code Analysis";
      case "sales-lead-qualification":
        return "Lead Scoring";
      case "manufacturing-ops":
        return "Anomaly Detection";
      case "government-public-sector":
        return "Policy Check";
      case "higher-education":
        return "Learning Paths";
      case "documentation-teams":
        return "Content Gen";
      case "product-teams":
        return "Data Analysis";
      case "marketing-teams":
        return "Personalization";
      default:
        return "Processing";
    }
  };

  const getResponseType = () => {
    switch (slug) {
      case "ai-research-assistant":
        return "Research Report";
      case "customer-support-agent":
      case "b2b-customer-support":
      case "b2c-customer-service":
        return "Support Response";
      case "code-review-assistant":
        return "Review Comments";
      case "sales-lead-qualification":
        return "Qualified Lead";
      case "manufacturing-ops":
        return "Maintenance Alert";
      case "government-public-sector":
        return "Service Response";
      case "higher-education":
        return "Student Support";
      case "documentation-teams":
        return "Documentation";
      case "product-teams":
        return "Insights Report";
      case "marketing-teams":
        return "Campaign Output";
      default:
        return "Response";
    }
  };

  const agentName = getAgentName();
  const requestType = getRequestType();
  const toolAction = getToolAction();
  const responseType = getResponseType();

  const diagramValue = `sequenceDiagram
    participant User
    participant VoltAgent
    participant ${agentName}
    participant Tools
    participant VoltOps
    
    User->>VoltAgent: ${requestType}
    VoltAgent->>VoltOps: Log Request
    VoltAgent->>+${agentName}: Initialize Agent
    
    ${agentName}->>Tools: ${toolAction}
    Tools-->>VoltOps: Trace Tools
    Tools-->>${agentName}: Results
    
    ${agentName}->>VoltOps: Log Decision
    ${agentName}-->>-VoltAgent: Processed Output
    
    VoltAgent->>VoltOps: Log Response
    VoltAgent-->>User: ${responseType}
    
    Note over VoltOps: Full Observability<br/>Token Usage<br/>Latency Metrics<br/>Decision Path`;

  return <Mermaid value={diagramValue} />;
};

export default MermaidDiagram;
