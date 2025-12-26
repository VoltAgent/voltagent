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

// Simple SVG icons
const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const PartialIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="6" />
  </svg>
);

const NotSupportedIcon = () => (
  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const CommunityIcon = () => (
  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="6" />
  </svg>
);

const StatusIcon = ({ status }: { status: ComparisonStatus }) => {
  switch (status) {
    case "ready":
      return <CheckIcon />;
    case "partial":
      return <PartialIcon />;
    case "community":
      return <CommunityIcon />;
    default:
      return <NotSupportedIcon />;
  }
};

const Cell = ({ cell, isHighlighted }: { cell: ComparisonCell; isHighlighted?: boolean }) => (
  <td
    className={`px-4 py-3 text-center ${
      isHighlighted ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
    }`}
  >
    <div className="flex flex-col items-center gap-1">
      <StatusIcon status={cell.status} />
      {cell.note && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight max-w-[100px] text-center">
          {cell.note}
        </span>
      )}
    </div>
  </td>
);

export const ComparisonTable = ({ rows }: ComparisonTableProps) => {
  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                Feature
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 border-b border-gray-200 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-900/20">
                VoltAgent
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                Mastra
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                AI SDK
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                AI SDK Tools
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.feature}
                className={`
                                    border-b border-gray-100 dark:border-gray-800
                                    hover:bg-gray-50 dark:hover:bg-gray-800/50
                                    transition-colors
                                    ${
                                      index % 2 === 1
                                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                                        : "bg-white dark:bg-gray-900"
                                    }
                                `}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {row.link ? (
                    <a
                      href={row.link}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
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
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span>Built-in</span>
        </div>
        <div className="flex items-center gap-2">
          <PartialIcon />
          <span>Requires extra code</span>
        </div>
        <div className="flex items-center gap-2">
          <CommunityIcon />
          <span>Community</span>
        </div>
        <div className="flex items-center gap-2">
          <NotSupportedIcon />
          <span>Not supported</span>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTable;
