import React, { useState } from 'react'
import { TopBar } from './TopBar'
import { Sidebar, ViewType } from './Sidebar'
// Import Pages
import { Observability } from '../../pages/Observability'
import { Agents } from '../../pages/Agents'
import { Analytics } from '../../pages/Analytics'
import { Traces } from '../../pages/Traces'
import { Logs } from '../../pages/Logs'
import { Settings } from '../../pages/Settings'
import { Memory, Workflows, Tools, Prompts } from '../../pages/OtherPages'

export function Shell() {
  const [activeView, setActiveView] = useState<ViewType>('observability')
  
  const renderView = () => {
    switch (activeView) {
      case 'observability':
        return <Observability />
      case 'agents':
        return <Agents />
      case 'analytics':
        return <Analytics />
      case 'traces':
        return <Traces />
      case 'logs':
        return <Logs />
      case 'settings':
        return <Settings />
      case 'memory':
        return <Memory />
      case 'workflows':
        return <Workflows />
      case 'tools':
        return <Tools />
      case 'prompts':
        return <Prompts />
      default:
        return <Observability />
    }
  }
  
  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1311] font-sans text-gray-100 overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-hidden relative">{renderView()}</main>
      </div>
    </div>
  )
}
