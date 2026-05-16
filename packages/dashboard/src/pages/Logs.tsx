import React from 'react'
import {
  Terminal as TerminalIcon,
  Play,
  Download,
  Trash2,
} from 'lucide-react'

const mockLogs = [
  {
    time: '14:22:01.123',
    level: 'INFO',
    source: 'system',
    msg: 'VoltAgent Core initialized successfully on port 3141',
  },
  {
    time: '14:22:05.441',
    level: 'INFO',
    source: 'router',
    msg: 'Incoming request to /api/v1/agents/InstagramAdCreator/invoke',
  },
  {
    time: '14:22:05.450',
    level: 'DEBUG',
    source: 'InstagramAdCreator',
    msg: 'Compiling prompt template with variables: {product: "Roku"}',
  },
  {
    time: '14:22:06.102',
    level: 'INFO',
    source: 'llm_client',
    msg: 'Sending request to OpenAI API (model: gpt-4o-mini)',
  },
  {
    time: '14:22:08.991',
    level: 'INFO',
    source: 'llm_client',
    msg: 'Received response from OpenAI API (duration: 2.88s, tokens: 450)',
  },
  {
    time: '14:22:09.015',
    level: 'WARN',
    source: 'InstagramAdCreator',
    msg: 'Output length exceeds recommended limit for Instagram captions',
  },
  {
    time: '14:22:15.332',
    level: 'ERROR',
    source: 'DataAnalyzer',
    msg: 'Failed to parse JSON output from LLM. Unexpected token < at position 0.',
  },
  {
    time: '14:22:15.335',
    level: 'INFO',
    source: 'router',
    msg: 'Returning 500 Internal Server Error to client',
  },
]

export function Logs() {
  return (
    <div className="p-8 h-full flex flex-col bg-[#0d1311]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">System Logs</h1>
          <p className="text-sm text-gray-400">
            Real-time terminal output from your agent fleet.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            className="p-2 bg-[#111614] border border-gray-800 rounded text-emerald-500 hover:bg-gray-800 transition-colors"
            title="Resume Auto-scroll"
          >
            <Play size={16} />
          </button>
          <button
            className="p-2 bg-[#111614] border border-gray-800 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Export Logs"
          >
            <Download size={16} />
          </button>
          <button
            className="p-2 bg-[#111614] border border-gray-800 rounded text-red-500 hover:bg-gray-800 transition-colors"
            title="Clear Logs"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#050505] border border-gray-800 rounded-xl overflow-hidden flex flex-col font-mono text-[13px]">
        <div className="h-10 bg-[#111614] border-b border-gray-800 flex items-center px-4 space-x-4 text-xs text-gray-400">
          <TerminalIcon size={14} />
          <span>bash - voltagent-core</span>
          <div className="flex-1"></div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="accent-emerald-500"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {mockLogs.map((log, i) => (
            <div
              key={i}
              className="flex hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
            >
              <span className="text-gray-600 w-28 shrink-0">{log.time}</span>
              <span
                className={`w-16 shrink-0 font-bold ${log.level === 'INFO' ? 'text-blue-400' : log.level === 'WARN' ? 'text-amber-400' : log.level === 'ERROR' ? 'text-red-400' : 'text-gray-400'}`}
              >
                {log.level}
              </span>
              <span className="text-purple-400 w-32 shrink-0">
                [{log.source}]
              </span>
              <span className="text-gray-300 break-all">{log.msg}</span>
            </div>
          ))}
          <div className="flex px-2 py-0.5">
            <span className="text-emerald-500 animate-pulse">_</span>
          </div>
        </div>
      </div>
    </div>
  )
}
