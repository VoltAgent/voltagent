import { motion } from "framer-motion";
import { useState } from "react";
import styles from "./PricingCalculatorModal.module.css";

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingCalculatorModal = ({ isOpen, onClose }: PricingCalculatorModalProps) => {
  const [traceCount, setTraceCount] = useState<number>(10000);
  const [selectedPlan, setSelectedPlan] = useState<"core" | "pro">("core");

  const calculateCost = () => {
    const traces = traceCount;
    const planConfig =
      selectedPlan === "core"
        ? { baseCost: 50, includedTraces: 50000 }
        : { baseCost: 250, includedTraces: 250000 };

    if (traces <= planConfig.includedTraces) {
      return {
        baseCost: planConfig.baseCost,
        overageCost: 0,
        totalCost: planConfig.baseCost,
        extraTraces: 0,
        includedTraces: planConfig.includedTraces,
      };
    }

    const extraTraces = traces - planConfig.includedTraces;
    const overageBlocks = Math.ceil(extraTraces / 5000);
    const overageCost = overageBlocks * 10;

    return {
      baseCost: planConfig.baseCost,
      overageCost,
      totalCost: planConfig.baseCost + overageCost,
      extraTraces,
      includedTraces: planConfig.includedTraces,
    };
  };

  const cost = calculateCost();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-[#1a1b1e] border border-[#2b2d2f] rounded-xl p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Pricing Calculator</h3>
          <div
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onClose();
              }
            }}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label="Close calculator"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>Close</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Plan Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Plan:</label>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => {
                setSelectedPlan("core");
                if (traceCount > 100000) setTraceCount(100000);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedPlan("core");
                  if (traceCount > 100000) setTraceCount(100000);
                }
              }}
              role="button"
              tabIndex={0}
              className={`p-3 rounded-lg font-medium transition-all cursor-pointer text-center ${
                selectedPlan === "core"
                  ? "bg-white text-black"
                  : "bg-[#2b2d2f] text-gray-300 hover:bg-[#3b3d3f]"
              }`}
            >
              Core ($50)
            </div>
            <div
              onClick={() => setSelectedPlan("pro")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedPlan("pro");
                }
              }}
              role="button"
              tabIndex={0}
              className={`p-3 rounded-lg font-medium transition-all cursor-pointer text-center ${
                selectedPlan === "pro"
                  ? "bg-white text-black"
                  : "bg-[#2b2d2f] text-gray-300 hover:bg-[#3b3d3f]"
              }`}
            >
              Pro ($250)
            </div>
          </div>
        </div>

        {/* Slider Input */}
        <div className="mb-6">
          <label htmlFor="trace-slider" className="block text-sm font-medium text-gray-300 mb-4">
            Monthly trace usage:{" "}
            <span className="text-white font-semibold">{traceCount.toLocaleString()}</span> traces
          </label>
          <div className="relative">
            <input
              id="trace-slider"
              type="range"
              min={0}
              max={selectedPlan === "core" ? 100000 : 500000}
              step={1000}
              value={traceCount}
              onChange={(e) => setTraceCount(Number(e.target.value))}
              className={`w-full h-2 bg-[#2b2d2f] rounded-lg appearance-none cursor-pointer ${styles.rangeSlider}`}
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                  (traceCount / (selectedPlan === "core" ? 100000 : 500000)) * 100
                }%, #2b2d2f ${(traceCount / (selectedPlan === "core" ? 100000 : 500000)) * 100}%, #2b2d2f 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0</span>
            <span>{selectedPlan === "core" ? "100,000+" : "500,000+"}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Slide to adjust your expected monthly trace count
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4 mb-6">
          <div className="bg-[#232527] rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Cost Breakdown</h4>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {selectedPlan === "core" ? "Core" : "Pro"} Plan Base
                </span>
                <span className="text-white font-medium">${cost.baseCost}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Included traces</span>
                <span className="text-white font-medium">
                  {cost.includedTraces.toLocaleString()}
                </span>
              </div>

              {cost.extraTraces > 0 && (
                <div className="border-t border-[#2b2d2f] pt-3 mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Extra traces</span>
                    <span className="text-white font-medium">
                      {cost.extraTraces.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Overage cost</span>
                    <span className="text-white font-medium">${cost.overageCost}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-[#2b2d2f] pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total Monthly Cost</span>
                  <span className="text-white text-lg font-bold">${cost.totalCost}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing info */}
          <div className="p-3 bg-[#232527] rounded-lg">
            <p className="text-gray-400 text-xs">
              <span className="font-medium text-white">Pricing:</span> $
              {selectedPlan === "core" ? "50" : "250"}/month base + $10 per 5,000 additional traces
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <div
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onClose();
              }
            }}
            role="button"
            tabIndex={0}
            className="flex-1 inline-flex items-center justify-center font-semibold rounded-lg transition-colors px-4 py-3 text-sm bg-[#2b2d2f] text-white hover:bg-[#3b3d3f] cursor-pointer"
          >
            Close
          </div>
          <div
            onClick={() => window.open("https://console.voltagent.dev", "_blank")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                window.open("https://console.voltagent.dev", "_blank");
              }
            }}
            role="button"
            tabIndex={0}
            className="flex-1 inline-flex items-center justify-center font-semibold rounded-lg transition-colors px-4 py-3 text-sm bg-white text-black hover:bg-gray-200 cursor-pointer"
          >
            Get Started
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PricingCalculatorModal;
