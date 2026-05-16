import { motion } from 'framer-motion'
import { Plus, Bot, Activity, Clock, MoreVertical } from 'lucide-react'

const mockAgents = [
  {
    id: 1,
    name: 'InstagramAdCreator',
    desc: 'Generates high-converting ad copy and visual prompts for Instagram campaigns.',
    model: 'gpt-4o-mini',
    status: 'active',
    runs: '12.4k',
    lastRun: '2m ago',
  },
  {
    id: 2,
    name: 'ResearchAgent',
    desc: 'Scrapes web sources and synthesizes research reports on given topics.',
    model: 'claude-3-5-sonnet',
    status: 'idle',
    runs: '3.2k',
    lastRun: '1h ago',
  },
  {
    id: 3,
    name: 'CodeReviewer',
    desc: 'Analyzes PR diffs and provides automated code review comments.',
    model: 'gpt-4o',
    status: 'active',
    runs: '45.1k',
    lastRun: 'Just now',
  },
  {
    id: 4,
    name: 'CustomerSupportBot',
    desc: 'Handles tier 1 customer inquiries and routes complex issues to humans.',
    model: 'gemini-1.5-pro',
    status: 'active',
    runs: '89.2k',
    lastRun: '5m ago',
  },
  {
    id: 5,
    name: 'DataAnalyzer',
    desc: 'Processes CSV/JSON data and generates statistical summaries and charts.',
    model: 'gpt-4o-mini',
    status: 'failed',
    runs: '1.1k',
    lastRun: '2h ago',
  },
  {
    id: 6,
    name: 'EmailOutreach',
    desc: 'Drafts personalized cold outreach emails based on LinkedIn profiles.',
    model: 'claude-3-haiku',
    status: 'idle',
    runs: '8.5k',
    lastRun: '1d ago',
  },
]

export function Agents() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-[#0d1311]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Agents</h1>
          <p className="text-sm text-gray-400">
            Manage and monitor your deployed AI agents.
          </p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <Plus size={16} className="mr-2" /> New Agent
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        {['All', 'Active', 'Idle', 'Failed'].map((filter, i) => (
          <button
            key={filter}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${i === 0 ? 'bg-gray-800 text-white' : 'bg-[#111614] border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAgents.map((agent, i) => (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: i * 0.05,
            }}
            key={agent.id}
            className="bg-[#111614] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all group hover:shadow-lg hover:shadow-black/50"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:border-emerald-500/30 transition-colors">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {agent.name}
                  </h3>
                  <div className="flex items-center mt-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${agent.status === 'active' ? 'bg-emerald-500' : agent.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'}`}
                    ></div>
                    <span className="text-[10px] text-gray-400 capitalize">
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-gray-500 hover:text-white">
                <MoreVertical size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4 line-clamp-2 h-8">
              {agent.desc}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
              <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
                {agent.model}
              </span>
              <div className="flex space-x-3 text-[11px] text-gray-500">
                <span className="flex items-center">
                  <Activity size={12} className="mr-1" /> {agent.runs}
                </span>
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" /> {agent.lastRun}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
