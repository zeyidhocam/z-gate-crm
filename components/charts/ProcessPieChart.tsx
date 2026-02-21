"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ProcessData {
    name: string
    value: number
    color: string
}

interface ProcessPieChartProps {
    data: ProcessData[]
}

const COLORS = [
    '#22d3ee', // cyan
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#6366f1', // indigo
]

// Custom label renderer
const renderCustomLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 }: { cx?: number, cy?: number, midAngle?: number, innerRadius?: number, outerRadius?: number, percent?: number }) => {
    if (percent < 0.08) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '11px', fontWeight: 700 }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ name?: string, value?: number, payload?: ProcessData }> }) => {
    if (active && payload?.length) {
        const item = payload[0]
        return (
            <div className="bg-[#0c1929] border border-cyan-500/30 rounded-xl px-4 py-3 shadow-xl shadow-cyan-500/10">
                <p className="text-sm font-bold text-cyan-300 mb-1">{item.name || '-'}</p>
                <p className="text-lg font-black text-white">{item.value || 0} <span className="text-xs text-slate-400">müşteri</span></p>
            </div>
        )
    }
    return null
}

export function ProcessPieChart({ data }: ProcessPieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
                Veri yok
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {/* Gradients for cells */}
                            {data.map((entry, index) => (
                                <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={entry.color || COLORS[index % COLORS.length]} stopOpacity={1} />
                                    <stop offset="100%" stopColor={entry.color || COLORS[index % COLORS.length]} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth={2}
                            labelLine={false}
                            label={renderCustomLabel}
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#pieGradient-${index})`}
                                    style={{ filter: `drop-shadow(0 0 8px ${entry.color || COLORS[index % COLORS.length]}40)` }}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {/* Legend - ayrı div ile taşma önlenir */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
                {data.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
                        />
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">{entry.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

