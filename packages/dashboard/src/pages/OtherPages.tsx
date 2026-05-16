import React from 'react'
import { Database, Workflow, Wrench, FileText } from 'lucide-react'

export function Memory() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-[#0d1311] text-center">
      <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
        <Database size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Vector Memory &amp; Stores
      </h2>
      <p className="text-gray-400 max-w-md">
        Manage long-term memory, vector embeddings, and conversation history for
        your agents.
      </p>
    </div>
  )
}

export function Workflows() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-[#0d1311] text-center">
      <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
        <Workflow size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Multi-Agent Workflows
      </h2>
      <p className="text-gray-400 max-w-md">
        Design and orchestrate complex workflows involving multiple specialized
        agents.
      </p>
    </div>
  )
}

export function Tools() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-[#0d1311] text-center">
      <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
        <Wrench size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Tool Registry</h2>
      <p className="text-gray-400 max-w-md">
        Register and manage external APIs, functions, and tools that your agents
        can invoke.
      </p>
    </div>
  )
}

export function Prompts() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-[#0d1311] text-center">
      <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
        <FileText size={32} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Prompt Library</h2>
      <p className="text-gray-400 max-w-md">
        Version control, test, and optimize your system prompts and templates.
      </p>
    </div>
  )
}
