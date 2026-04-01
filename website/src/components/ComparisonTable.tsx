import { CheckCircleIcon, MinusCircleIcon, UserGroupIcon } from "@heroicons/react/24/solid";

export type ComparisonStatus = "ready" | "partial" | "not-supported" | "community";

export interface ComparisonCell {
  status: ComparisonStatus;
  note?: string; // inline note text
}

export interface ComparisonRow {
  feature: string;
  link?: string;
  voltagent: ComparisonCell;
  mastra: ComparisonCell;
  aiSdk: ComparisonCell;
  aiSdkTools: ComparisonCell;
}

export interface ComparisonTableProps {
  rows: ComparisonRow[];
}

// Partial icon (circle) - custom since heroicons doesn't have a simple filled circle
const PartialIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#fbbf24" }}>
    <circle cx="10" cy="10" r="6" />
  </svg>
);

const StatusIcon = ({ status }: { status: ComparisonStatus }) => {
  switch (status) {
    case "ready":
      return <CheckCircleIcon className="w-5 h-5" style={{ color: "#22c55e" }} />;
    case "partial":
      return <PartialIcon />;
    case "community":
      return <UserGroupIcon className="w-5 h-5" style={{ color: "#60a5fa" }} />;
    default:
      return <MinusCircleIcon className="w-5 h-5" style={{ color: "#ef4444" }} />;
  }
};

const Cell = ({ cell, isHighlighted }: { cell: ComparisonCell; isHighlighted?: boolean }) => (
  <td
    style={{
      padding: "12px 16px",
      textAlign: "center",
      backgroundColor: isHighlighted ? "#aaaaaa15" : "transparent",
      border: "none",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <StatusIcon status={cell.status} />
      {cell.note && (
        <span
          style={{
            fontSize: "10px",
            color: "#9ca3af",
            lineHeight: "1.25",
            maxWidth: "100px",
            textAlign: "center",
          }}
        >
          {cell.note}
        </span>
      )}
    </div>
  </td>
);

export const ComparisonTable = ({ rows }: ComparisonTableProps) => {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: 0 }}
    >
      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          width: "100%",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "100%",
            backgroundColor: "transparent",
            border: "1px solid #2b2d2f",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#232527" }}>
              <th
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#232527",
                  border: "none",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    width: "100%",
                  }}
                >
                  Feature
                </div>
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#2d2f31",
                  border: "none",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    width: "100%",
                  }}
                >
                  VoltAgent
                </div>
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#232527",
                  border: "none",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    width: "100%",
                  }}
                >
                  Mastra
                </div>
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#232527",
                  border: "none",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    width: "100%",
                  }}
                >
                  AI SDK
                </div>
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  backgroundColor: "#232527",
                  border: "none",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    width: "100%",
                  }}
                >
                  AI SDK Tools
                </div>
              </th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: "transparent" }}>
            {rows.map((row) => (
              <tr key={row.feature} style={{ backgroundColor: "transparent" }}>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#ffffff",
                    backgroundColor: "transparent",
                    border: "none",
                  }}
                >
                  {row.link ? (
                    <a
                      href={row.link}
                      style={{
                        color: "#60a5fa",
                        textDecoration: "none",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {row.feature}
                    </a>
                  ) : (
                    row.feature
                  )}
                </td>
                <Cell cell={row.voltagent} isHighlighted />
                <Cell cell={row.mastra} />
                <Cell cell={row.aiSdk} />
                <Cell cell={row.aiSdkTools} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          fontSize: "16px",
          color: "#9ca3af",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircleIcon className="w-5 h-5" style={{ color: "#22c55e" }} />
          <span>Built-in</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PartialIcon />
          <span>Requires extra code</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserGroupIcon className="w-5 h-5" style={{ color: "#60a5fa" }} />
          <span>Community</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MinusCircleIcon className="w-5 h-5" style={{ color: "#ef4444" }} />
          <span>Not supported</span>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTable;
