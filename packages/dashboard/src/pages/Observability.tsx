import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  ChevronRight,
  Eye,
  Settings,
  Maximize2,
  Search,
  Filter,
  Bot,
  Clock,
} from 'lucide-react'

export function Observability() {
  const [activeTab, setActiveTab] = useState('Details')
  
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d1311]">
      {/* Left Column - Trace List */}
      <div className="w-72 border-r border-gray-800 bg-[#0a0f0d] flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white mb-3">Live Traces</h2>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder="Filter traces..."
                className="w-full bg-[#111614] border border-gray-800 rounded text-xs text-white pl-6 pr-2 py-1.5 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button className="p-1.5 bg-[#111614] border border-gray-800 rounded text-gray-400 hover:text-white">
              <Filter size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[
            {
              id: '1',
              name: 'InstagramAdSupervisor',
              model: 'gpt-4o-mini',
              time: 'Just now',
              duration: '1m 24s',
              status: 'success',
            },
            {
              id: '2',
              name: 'ResearchAgent',
              model: 'claude-3-5',
              time: '2m ago',
              duration: '45s',
              status: 'success',
            },
            {
              id: '3',
              name: 'CodeReviewer',
              model: 'gpt-4o',
              time: '15m ago',
              duration: '2m 10s',
              status: 'error',
            },
            {
              id: '4',
              name: 'CustomerSupportBot',
              model: 'gemini-1.5',
              time: '1h ago',
              duration: '12s',
              status: 'success',
            },
            {
              id: '5',
              name: 'DataAnalyzer',
              model: 'gpt-4o-mini',
              time: '2h ago',
              duration: '3m 05s',
              status: 'warning',
            },
          ].map((trace, i) => (
            <div
              key={trace.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${i === 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#111614] border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${trace.status === 'success' ? 'bg-emerald-500' : trace.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}
                  />
                  <span className="text-xs font-medium text-gray-200 truncate w-32">
                    {trace.name}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">{trace.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-gray-800/80 text-gray-400 px-1.5 py-0.5 rounded">
                  {trace.model}
                </span>
                <span className="text-[10px] text-gray-400">
                  {trace.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Flow Graph */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#111614]">
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0a0f0d]/50 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-white">
              Execution Flow
            </span>
            <span className="text-xs text-gray-500">
              Trace ID:{' '}
              <span className="font-mono text-gray-400">c4ee1nckj7n</span>
            </span>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-xs font-medium flex items-center hover:bg-emerald-500/20 transition-colors">
              <Play size={12} className="mr-1.5" /> Replay
            </button>
          </div>
        </div>

        {/* Graph Area */}
        <div className="flex-1 relative overflow-auto p-8">
          <div className="min-w-[800px] min-h-[500px] relative">
            {/* Connecting Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                zIndex: 0,
              }}
            >
              <path
                d="M 220 120 L 320 120"
                stroke="#374151"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                className="animate-[dash_20s_linear_infinite]"
              />
              <path
                d="M 540 120 L 640 120"
                stroke="#374151"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                className="animate-[dash_20s_linear_infinite]"
              />
            </svg>

            {/* Node 1: Input */}
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="absolute left-0 top-[40px] w-56 bg-[#1a211e] border border-gray-700 rounded-xl p-4 z-10 shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-xs font-semibold text-white">
                  <ChevronRight size={14} className="mr-1.5 text-gray-500" />{' '}
                  Input
                </div>
                <Eye
                  size={12}
                  className="text-gray-500 hover:text-white cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed bg-[#111614] p-2 rounded border border-gray-800/50">
                Create Instagram ad visuals using Google Gemini AI
              </p>
              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-xs font-semibold text-white">
                    <ChevronRight size={14} className="mr-1.5 text-gray-500" />{' '}
                    Output
                  </div>
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    completed
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                  Here are the generated Instagram ad visuals for the Roku
                  Streaming Stick Plus 2025...
                </p>
              </div>
            </motion.div>

            {/* Node 2: InstagramAdCreator */}
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.1,
              }}
              className="absolute left-[320px] top-[20px] w-64 bg-[#1a211e] border border-emerald-500/50 rounded-xl p-4 z-10 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white flex items-center">
                  <Bot size={14} className="mr-2 text-emerald-500" />
                  InstagramAdCreator
                </div>
                <Eye
                  size={14}
                  className="text-gray-500 hover:text-white cursor-pointer"
                />
              </div>
              <div className="bg-[#111614] rounded-lg p-3 mb-3 border border-gray-800">
                <div className="text-[10px] text-gray-500 mb-1.5 flex items-center font-medium uppercase tracking-wider">
                  <Settings size={10} className="mr-1.5" /> Instructions
                </div>
                <p className="text-[11px] text-gray-300 line-clamp-3 leading-relaxed">
                  You are InstagramAdCreator. You are an Instagram advertising
                  specialist using Google&apos;s Gemini AI for ad creation. Your goal
                  is to generate high-converting visuals.
                </p>
              </div>
              <div className="flex justify-between items-center text-[11px] bg-gray-900/50 p-2 rounded">
                <span className="flex items-center text-emerald-500 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                  Completed
                </span>
                <span className="text-gray-500">
                  Model:{' '}
                  <span className="text-gray-300 bg-gray-800 px-1 rounded">
                    gpt-4o-mini
                  </span>
                </span>
              </div>
            </motion.div>

            {/* Node 3: InstagramAdSupervisor */}
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
              }}
              className="absolute left-[640px] top-[40px] w-56 bg-[#1a211e] border border-gray-700 rounded-xl p-4 z-10 shadow-xl opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white flex items-center">
                  <Bot size={14} className="mr-2 text-gray-400" />
                  InstagramAdSupervisor
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-800 rounded w-full"></div>
                <div className="h-2 bg-gray-800 rounded w-5/6"></div>
                <div className="h-2 bg-gray-800 rounded w-4/6"></div>
              </div>
              <div className="mt-4 flex items-center text-[10px] text-gray-500">
                <Clock size={10} className="mr-1" /> Waiting for input...
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Column - Inspector */}
      <div className="w-80 border-l border-gray-800 bg-[#0a0f0d] flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800 bg-[#0d1311]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-sm font-semibold text-white">
                InstagramAdCreator
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                OK
              </span>
              <button className="text-gray-500 hover:text-white transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 bg-[#111614] p-2 rounded border border-gray-800">
            <div>
              Started: <span className="text-gray-200">Sep 30, 20:51</span>
            </div>
            <div>
              Duration: <span className="text-emerald-500">1m 24s</span>
            </div>
            <div>
              Tokens: <span className="text-gray-200">8,749</span>
            </div>
            <div>
              Cost: <span className="text-gray-200">$0.012</span>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-800 text-xs bg-[#0d1311]">
          {['Details', 'Attributes', 'Logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 font-medium transition-colors ${activeTab === tab ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'Details' && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider text-gray-500">
                  Key Features
                </h4>
                <ul className="text-[12px] text-gray-300 space-y-2 list-disc pl-4 marker:text-gray-600">
                  <li>Access to all top streaming apps in one place</li>
                  <li>
                    Home screen designed for quick access to favorite content
                  </li>
                  <li>Works with Alexa, Apple AirPlay and HomeKit</li>
                  <li>
                    Supports major streaming services like Apple TV+, Disney+,
                    Hulu
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider text-gray-500">
                  Call to Action
                </h4>
                <div className="bg-[#111614] border border-gray-800 rounded p-2 text-[12px] text-gray-300">
                  Add to Cart
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider text-gray-500">
                  Generated Output
                </h4>
                <div className="bg-[#1a211e] border border-gray-800 rounded-lg p-4 shadow-lg">
                  <div className="text-[10px] font-bold text-emerald-500 mb-1 tracking-widest">
                    ROKU
                  </div>
                  <div className="text-base font-bold text-white mb-3 leading-tight">
                    Roku Streaming
                    <br />
                    Stick Plus 2025
                  </div>
                  <div className="h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-md mb-3 relative overflow-hidden border border-gray-700">
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-tl-full blur-xl"></div>
                    <div className="absolute top-3 left-3 w-10 h-5 bg-white/20 rounded backdrop-blur-sm"></div>
                    <div className="absolute bottom-3 left-3 right-3 h-2 bg-white/10 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] text-gray-400 w-2/3 leading-relaxed">
                      4K streaming made simple. With America&apos;s #1 TV streaming
                      platform, enjoying popular apps is easy and fun.
                    </p>
                    <button className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-medium transition-colors">
                      Upgrade Today
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === 'Attributes' && (
            <div className="text-sm text-gray-400 flex items-center justify-center h-full">
              Attributes data...
            </div>
          )}
          {activeTab === 'Logs' && (
            <div className="text-sm text-gray-400 flex items-center justify-center h-full">
              Execution logs...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
