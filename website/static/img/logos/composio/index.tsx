import React from "react";

export const ComposioLogo = ({ className }: { className?: string }) => (
  <div
    className={`flex items-center justify-center bg-gray-500 text-white font-bold ${className}`}
    style={{ width: "100%", height: "100%" }} // Ensure it fills the allocated space in the tab
  >
    CM
  </div>
);
