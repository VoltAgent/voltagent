import type { FC, ReactNode } from "react";
import VoltLogo from "./VoltLogo"; // VoltLogo is used as a value

interface LayoutProps {
  children: ReactNode;
  userId?: string | null;
  handleLogout?: () => void;
}

const Layout: FC<LayoutProps> = ({ children, userId, handleLogout }) => {
  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white p-4 shadow-lg border-b border-[#333333] flex justify-between items-center shrink-0">
        <div className="flex items-center">
          <VoltLogo className="mr-2" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">voltagent</h1>
            <p className="text-xs text-[#a1a1aa]">Google Drive Assistant</p>
          </div>
        </div>
        {userId && handleLogout && (
          <button
            onClick={handleLogout}
            type="button"
            className="bg-[#27272a] hover:bg-[#3f3f46] text-white py-1.5 px-3 rounded-md text-sm border border-[#333333] transition-colors cursor-pointer"
          >
            Disconnect ({userId})
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
};

export default Layout;
