"use client";

import { useState } from "react";
import { calculateExpression } from "../actions";

export function Calculator() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState("");

  async function handleSubmit(formData: FormData) {
    const expr = formData.get("expression") as string;
    if (!expr.trim()) return;

    setLoading(true);
    try {
      const calcResult = await calculateExpression(expr);
      setResult(calcResult);
      setExpression(expr);
    } catch {
      setResult("Error calculating expression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1b1b1b] border-2 border-[#333333] rounded-xl shadow-xl overflow-hidden max-w-md mx-auto">
      <div className="bg-[#333333] p-6">
        <h2 className="text-white text-2xl font-bold">AI Calculator</h2>
      </div>

      <div className="p-6">
        <form action={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="expression" className="block text-sm font-medium text-gray-300 mb-2">
              Enter your calculation
            </label>
            <div className="relative">
              <input
                id="expression"
                name="expression"
                type="text"
                placeholder="E.g. (5 + 3) * 2"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#24f2ff] focus:border-[#24f2ff] transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Try complex expressions like "8 * (5 + 3) / 2"
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#333333] hover:bg-[#444444] focus:ring-4 focus:ring-[#333333]/50 text-white font-medium rounded-lg px-5 py-3 transition-all duration-200 ease-in-out focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Calculating...
              </span>
            ) : (
              "Calculate"
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-300">Result</h3>
              <span className="text-xs bg-[#333333]/20 text-gray-300 px-2 py-1 rounded-full">
                AI Generated
              </span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 text-gray-400">{expression} =</div>
              <div className="text-lg font-bold text-[#fdfd96]">{result}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
