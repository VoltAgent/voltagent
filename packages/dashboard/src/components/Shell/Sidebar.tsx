import React from 'react'
import {
  Activity,
  Bot,
  GitBranch,
  Database,
  Workflow,
  Wrench,
  FileText,
  Terminal,
  BarChart3,
  Settings,
} from 'lucide-react'

export type ViewType =
  | 'observability'
  | 'agents'
  | 'traces'
  | 'memory'
  | 'workflows'
  | 'tools'
  | 'prompts'
  | 'logs'
  | 'analytics'
  | 'settings'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const navItems = [
  {
    id: 'observability',
    icon: Activity,
    label: 'Observability',
  },
  {
    id: 'agents',
    icon: Bot,
    label: 'Agents',
  },
  {
    id: 'traces',
    icon: GitBranch,
    label: 'Traces',
  },
  {
    id: 'memory',
    icon: Database,
    label: 'Memory',
  },
  {
    id: 'workflows',
    icon: Workflow,
    label: 'Workflows',
  },
  {
    id: 'tools',
    icon: Wrench,
    label: 'Tools',
  },
  {
    id: 'prompts',
    icon: FileText,
    label: 'Prompts',
  },
  {
    id: 'logs',
    icon: Terminal,
    label: 'Logs',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
]

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <div className="w-14 border-r border-gray-800 bg-[#0a0d0c] flex flex-col items-center py-4 shrink-0 z-20">
      <div className="flex flex-col space-y-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`relative p-2.5 rounded-lg flex items-center justify-center group transition-all duration-200 ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
              title={item.label}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.label}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto w-full px-2">
        <button
          onClick={() => onViewChange('settings')}
          className={`relative p-2.5 rounded-lg flex items-center justify-center group w-full transition-all duration-200 ${activeView === 'settings' ? 'bg-emerald-500/10 text-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
          title="Settings"
        >
          <Settings
            size={18}
            strokeWidth={activeView === 'settings' ? 2.5 : 2}
          />
          {activeView === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            Settings
          </div>
        </button>
      </div>
    </div>
  )
}
