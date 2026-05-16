import React, { useState } from 'react'
import { Save } from 'lucide-react'

export function Settings() {
  const [activeTab, setActiveTab] = useState('General')
  const tabs = [
    'General',
    'API Keys',
    'Integrations',
    'Team',
    'Billing',
    'Webhooks',
  ]
  
  return (
    <div className="p-8 h-full flex bg-[#0d1311]">
      <div className="w-64 pr-8 border-r border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-emerald-500/10 text-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 pl-8 max-w-3xl">
        {activeTab === 'General' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Project Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    defaultValue="The New Sexy"
                    className="w-full bg-[#111614] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Production environment for main agent fleet."
                    className="w-full bg-[#111614] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Environment
                  </label>
                  <select className="w-full bg-[#111614] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50 appearance-none">
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors">
                  <Save size={16} className="mr-2" /> Save Changes
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800">
              <h2 className="text-lg font-semibold text-red-500 mb-4">
                Danger Zone
              </h2>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">
                    Delete Project
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Permanently remove your project and all its data. This
                    action is not reversible.
                  </p>
                </div>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab !== 'General' && (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            {activeTab} settings coming soon...
          </div>
        )}
      </div>
    </div>
  )
}
