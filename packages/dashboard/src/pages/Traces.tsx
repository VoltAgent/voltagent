import React from 'react'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

const mockTraces = Array.from({
  length: 15,
}).map((_, i) => ({
  id: `tr_${Math.random().toString(36).substr(2, 9)}`,
  agent: ['InstagramAdCreator', 'ResearchAgent', 'CodeReviewer'][i % 3],
  model: ['gpt-4o', 'claude-3.5', 'gemini-1.5'][i % 3],
  duration: `${(Math.random() * 5).toFixed(2)}s`,
  tokens: Math.floor(Math.random() * 5000) + 100,
  status: i % 7 === 0 ? 'error' : i % 5 === 0 ? 'warning' : 'success',
  time: `${Math.floor(Math.random() * 60)}m ago`,
}))

export function Traces() {
  return (
    <div className="p-8 h-full flex flex-col bg-[#0d1311]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Traces</h1>
          <p className="text-sm text-gray-400">
            Detailed execution logs of all agent runs.
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search traces..."
              className="bg-[#111614] border border-gray-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500/50 w-64"
            />
          </div>
          <button className="bg-[#111614] border border-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-gray-800 transition-colors">
            <Filter size={14} className="mr-2" /> Filters
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#111614] border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-[#0a0f0d] border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Trace ID</th>
                <th className="px-6 py-4 font-medium">Agent</th>
                <th className="px-6 py-4 font-medium">Model</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Tokens</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Started At</th>
              </tr>
            </thead>
            <tbody>
              {mockTraces.map((trace) => (
                <tr
                  key={trace.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 group-hover:text-emerald-500 transition-colors">
                    {trace.id}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-200">
                    {trace.agent}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      {trace.model}
                    </span>
                  </td>
                  <td className="px-6 py-4">{trace.duration}</td>
                  <td className="px-6 py-4">{trace.tokens.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${trace.status === 'success' ? 'bg-emerald-500' : trace.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}
                      ></div>
                      <span className="capitalize text-xs">{trace.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{trace.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-auto p-4 border-t border-gray-800 flex items-center justify-between bg-[#0a0f0d]">
          <span className="text-xs text-gray-500">
            Showing 1 to 15 of 1,240 traces
          </span>
          <div className="flex space-x-2">
            <button className="p-1.5 rounded border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <button className="p-1.5 rounded border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
