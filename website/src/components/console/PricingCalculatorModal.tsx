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
        ? { baseCost: 50, includedTraces: 5000 }
        : { baseCost: 500, includedTraces: 20000 };

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
        className="relative w-full max-w-md bg-[#191c24] border border-gray-700/50 rounded-lg p-6 shadow-xl"
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
            <button
              type="button"
              onClick={() => setSelectedPlan("core")}
              className={`p-3 rounded-lg border font-medium transition-all ${
                selectedPlan === "core"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
              }`}
            >
              Core ($50)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("pro")}
              className={`p-3 rounded-lg border font-medium transition-all ${
                selectedPlan === "pro"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
              }`}
            >
              Pro ($250)
            </button>
          </div>
        </div>

        {/* Slider Input */}
        <div className="mb-6">
          <label htmlFor="trace-slider" className="block text-sm font-medium text-gray-300 mb-4">
            Monthly trace usage:{" "}
            <span className="text-emerald-400 font-semibold">{traceCount.toLocaleString()}</span>{" "}
            traces
          </label>
          <div className="relative">
            <input
              id="trace-slider"
              type="range"
              min={0}
              max={50000}
              step={1000}
              value={traceCount}
              onChange={(e) => setTraceCount(Number(e.target.value))}
              className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${styles.rangeSlider}`}
              style={{
                background: `linear-gradient(to right, #00d992 0%, #00d992 ${
                  (traceCount / 50000) * 100
                }%, #374151 ${(traceCount / 50000) * 100}%, #374151 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0</span>
            <span>50,000+</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Slide to adjust your expected monthly trace count
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4 mb-6">
          <div className="bg-[#292929] rounded-lg p-4 border border-gray-700/50">
            <h4 className="text-sm font-medium text-emerald-400 mb-3">Cost Breakdown</h4>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {selectedPlan === "core" ? "Core" : "Pro"} Plan Base
                </span>
                <span className="text-gray-100 font-medium">${cost.baseCost}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Included traces</span>
                <span className="text-gray-100 font-medium">
                  {cost.includedTraces.toLocaleString()}
                </span>
              </div>

              {cost.extraTraces > 0 && (
                <div className="border-t border-gray-700/50 pt-3 mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Extra traces</span>
                    <span className="text-gray-100 font-medium">
                      {cost.extraTraces.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Overage cost</span>
                    <span className="text-gray-100 font-medium">${cost.overageCost}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700/50 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-100 font-semibold">Total Monthly Cost</span>
                  <span className="text-emerald-400 text-lg font-bold">${cost.totalCost}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing info */}
          <div className="p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-md">
            <p className="text-emerald-400 text-xs">
              <span className="font-medium">Pricing:</span> $
              {selectedPlan === "core" ? "50" : "500"}/month base + $10 per 5,000 additional traces
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center border-solid border font-semibold rounded transition-colors px-4 py-3 text-sm bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.open("https://console.voltagent.dev", "_blank")}
            className="flex-1 inline-flex items-center justify-center border-solid border font-semibold rounded transition-colors px-4 py-3 text-sm bg-emerald-400 text-gray-900 border-emerald-400 hover:bg-emerald-300"
          >
            Get Started
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PricingCalculatorModal;
