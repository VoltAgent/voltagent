import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  BugAntIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  CreditCardIcon,
  DocumentMagnifyingGlassIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

export interface NodeConfig {
  id: string;
  label: string;
  icon: any;
  description: string;
  color: string;
  position?: { x: number; y: number };
}

export interface UseCaseAnimationConfig {
  centerNode: {
    label: string;
    icon: any;
    color: string;
  };
  nodes: NodeConfig[];
  particleColors: string[];
}

// Helper function to calculate circular positions
export const calculateCircularPositions = (nodeCount: number, radius = 150) => {
  const positions: { x: number; y: number }[] = [];
  const angleStep = (2 * Math.PI) / nodeCount;

  for (let i = 0; i < nodeCount; i++) {
    const angle = angleStep * i - Math.PI / 2; // Start from top
    positions.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return positions;
};

// Use case configurations
export const useCaseConfigs: Record<string, UseCaseAnimationConfig> = {
  "ai-research-assistant": {
    centerNode: {
      label: "Research Agent",
      icon: MagnifyingGlassIcon,
      color: "#00d992",
    },
    nodes: [
      {
        id: "query",
        label: "Research Query",
        icon: DocumentMagnifyingGlassIcon,
        description: "User research questions and topics",
        color: "#3b82f6",
      },
      {
        id: "papers",
        label: "Academic Papers",
        icon: BookOpenIcon,
        description: "Scientific publications and journals",
        color: "#8b5cf6",
      },
      {
        id: "web",
        label: "Web Search",
        icon: GlobeAltIcon,
        description: "Internet data and websites",
        color: "#ec4899",
      },
      {
        id: "patents",
        label: "Patent DB",
        icon: ShieldCheckIcon,
        description: "Patent databases and IP records",
        color: "#f59e0b",
      },
      {
        id: "market",
        label: "Market Data",
        icon: ChartBarIcon,
        description: "Market research and analytics",
        color: "#10b981",
      },
      {
        id: "report",
        label: "Research Report",
        icon: ClipboardDocumentCheckIcon,
        description: "Comprehensive analysis output",
        color: "#06b6d4",
      },
    ],
    particleColors: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"],
  },

  "customer-support-agent": {
    centerNode: {
      label: "Support Agent",
      icon: ChatBubbleLeftRightIcon,
      color: "#00d992",
    },
    nodes: [], // Nodes come from JSON now
    particleColors: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#10b981"],
  },

  "code-review-assistant": {
    centerNode: {
      label: "Review Agent",
      icon: CodeBracketSquareIcon,
      color: "#00d992",
    },
    nodes: [
      {
        id: "pr",
        label: "Pull Request",
        icon: ArrowPathIcon,
        description: "Code changes for review",
        color: "#3b82f6",
      },
      {
        id: "ast",
        label: "AST Analysis",
        icon: CpuChipIcon,
        description: "Abstract syntax tree parsing",
        color: "#8b5cf6",
      },
      {
        id: "security",
        label: "Security Scan",
        icon: ShieldCheckIcon,
        description: "Vulnerability detection",
        color: "#ef4444",
      },
      {
        id: "style",
        label: "Style Check",
        icon: PencilSquareIcon,
        description: "Code formatting and standards",
        color: "#f59e0b",
      },
      {
        id: "performance",
        label: "Performance",
        icon: ArrowTrendingUpIcon,
        description: "Performance optimization",
        color: "#10b981",
      },
      {
        id: "comments",
        label: "Review Comments",
        icon: ChatBubbleLeftRightIcon,
        description: "Feedback and suggestions",
        color: "#06b6d4",
      },
    ],
    particleColors: ["#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#06b6d4"],
  },

  "sales-lead-qualification": {
    centerNode: {
      label: "Lead Agent",
      icon: UserGroupIcon,
      color: "#00d992",
    },
    nodes: [
      {
        id: "lead",
        label: "Lead Data",
        icon: UserCircleIcon,
        description: "Prospect information",
        color: "#3b82f6",
      },
      {
        id: "enrichment",
        label: "Data Enrichment",
        icon: SparklesIcon,
        description: "Enhanced lead profiles",
        color: "#8b5cf6",
      },
      {
        id: "scoring",
        label: "Lead Scoring",
        icon: ChartBarIcon,
        description: "Qualification metrics",
        color: "#f59e0b",
      },
      {
        id: "crm",
        label: "CRM Update",
        icon: ServerStackIcon,
        description: "Salesforce/HubSpot sync",
        color: "#ec4899",
      },
      {
        id: "routing",
        label: "SDR Routing",
        icon: ArrowPathIcon,
        description: "Sales team assignment",
        color: "#10b981",
      },
      {
        id: "outreach",
        label: "Personalized Outreach",
        icon: ChatBubbleLeftRightIcon,
        description: "Customized messaging",
        color: "#06b6d4",
      },
    ],
    particleColors: ["#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#06b6d4"],
  },

  // Default configuration for other use cases
  default: {
    centerNode: {
      label: "VoltAgent",
      icon: SparklesIcon,
      color: "#00d992",
    },
    nodes: [
      {
        id: "website",
        label: "Website",
        icon: GlobeAltIcon,
        description: "Web interface interactions",
        color: "#3b82f6",
      },
      {
        id: "feature",
        label: "Feature Request",
        icon: SparklesIcon,
        description: "New feature submissions",
        color: "#8b5cf6",
      },
      {
        id: "billing",
        label: "Billing",
        icon: CreditCardIcon,
        description: "Payment and subscription",
        color: "#f59e0b",
      },
      {
        id: "account",
        label: "Account Question",
        icon: QuestionMarkCircleIcon,
        description: "Account related queries",
        color: "#ec4899",
      },
      {
        id: "bug",
        label: "Bug",
        icon: BugAntIcon,
        description: "Issue reports and fixes",
        color: "#ef4444",
      },
      {
        id: "technical",
        label: "Technical Guidance",
        icon: WrenchScrewdriverIcon,
        description: "Technical support and help",
        color: "#10b981",
      },
    ],
    particleColors: ["#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#ef4444", "#10b981"],
  },
};

// Get configuration for a specific use case
export const getUseCaseConfig = (slug: string): UseCaseAnimationConfig => {
  const config = useCaseConfigs[slug] || useCaseConfigs.default;

  // Calculate positions for nodes
  const positions = calculateCircularPositions(config.nodes.length);
  config.nodes = config.nodes.map((node, index) => ({
    ...node,
    position: positions[index],
  }));

  return config;
};
