import React from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Activity, Zap, DollarSign, Target } from 'lucide-react'

const traceData = [
  {
    time: '00:00',
    traces: 120,
  },
  {
    time: '04:00',
    traces: 300,
  },
  {
    time: '08:00',
    traces: 850,
  },
  {
    time: '12:00',
    traces: 1200,
  },
  {
    time: '16:00',
    traces: 950,
  },
  {
    time: '20:00',
    traces: 400,
  },
]

const tokenData = [
  {
    name: 'gpt-4o',
    tokens: 4000,
  },
  {
    name: 'claude-3.5',
    tokens: 3000,
  },
  {
    name: 'gemini-1.5',
    tokens: 2000,
  },
  {
    name: 'gpt-4o-mini',
    tokens: 8000,
  },
]

export function Analytics() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-[#0d1311]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-sm text-gray-400">
          System-wide performance and cost metrics.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Traces (24h)',
            value: '142.5K',
            change: '+12.5%',
            icon: Activity,
            color: 'text-blue-500',
          },
          {
            label: 'Avg Latency',
            value: '1.24s',
            change: '-5.2%',
            icon: Zap,
            color: 'text-amber-500',
          },
          {
            label: 'Total Cost (MTD)',
            value: '$842.50',
            change: '+2.4%',
            icon: DollarSign,
            color: 'text-emerald-500',
          },
          {
            label: 'Success Rate',
            value: '99.8%',
            change: '+0.1%',
            icon: Target,
            color: 'text-purple-500',
          },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
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
                delay: i * 0.1,
              }}
              key={stat.label}
              className="bg-[#111614] border border-gray-800 rounded-xl p-5"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-gray-400">
                  {stat.label}
                </span>
                <Icon size={16} className={stat.color} />
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-white">
                  {stat.value}
                </span>
                <span
                  className={`text-xs mb-1 ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}
                >
                  {stat.change}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.4,
          }}
          className="bg-[#111614] border border-gray-800 rounded-xl p-5 h-80"
        >
          <h3 className="text-sm font-semibold text-white mb-6">
            Traces over Time
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={traceData}>
              <defs>
                <linearGradient id="colorTraces" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111614',
                  borderColor: '#1f2937',
                  borderRadius: '8px',
                }}
                itemStyle={{
                  color: '#10b981',
                }}
              />
              <Area
                type="monotone"
                dataKey="traces"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTraces)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.5,
          }}
          className="bg-[#111614] border border-gray-800 rounded-xl p-5 h-80"
        >
          <h3 className="text-sm font-semibold text-white mb-6">
            Token Usage by Model
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tokenData}
              layout="vertical"
              margin={{
                left: 30,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="#4b5563"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{
                  fill: '#1f2937',
                }}
                contentStyle={{
                  backgroundColor: '#111614',
                  borderColor: '#1f2937',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="tokens"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
