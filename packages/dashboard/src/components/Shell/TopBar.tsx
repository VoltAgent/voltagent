import React from 'react'
import {
  Zap,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  Star,
  Search,
  Bell,
} from 'lucide-react'

export function TopBar() {
  return (
    <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0a0d0c] shrink-0">
      <div className="flex items-center space-x-3">
        <div className="flex items-center text-emerald-500">
          <Zap size={18} className="fill-emerald-500" />
        </div>
        <span className="font-semibold text-sm text-white">VoltAgent</span>
        <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-medium">
          Core
        </span>
        <ChevronRight size={14} className="text-gray-600" />
        <button className="text-sm text-gray-300 hover:text-white flex items-center">
          The New Sexy <ChevronDown size={14} className="ml-1 text-gray-500" />
        </button>

        <div className="ml-4 flex items-center bg-gray-900/50 rounded-md border border-gray-800 px-2 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-xs text-gray-400 font-mono">
            http://localhost:3141
          </span>
          <Clock size={12} className="ml-2 text-gray-500" />
        </div>

        <div className="flex items-center ml-2">
          <CheckCircle2 size={14} className="text-emerald-500 mr-1" />
          <span className="text-xs text-gray-400">Connected</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search traces, agents..."
            className="bg-[#111614] border border-gray-800 text-xs text-white rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 w-64 transition-all"
          />
        </div>
        <div className="flex items-center text-xs text-gray-400 hover:text-white cursor-pointer transition-colors">
          <Star size={14} className="mr-1" /> 3.5K
        </div>
        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#0a0d0c]"></span>
        </button>
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 cursor-pointer border border-gray-700"></div>
      </div>
    </div>
  )
}
