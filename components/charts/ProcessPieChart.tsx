"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { PieLabelRenderProps, TooltipProps } from 'recharts'

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
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
    if (!percent || percent < 0.08) return null
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
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        const entry = payload[0]
        return (
            <div className="bg-[#0c1929] border border-cyan-500/30 rounded-xl px-4 py-3 shadow-xl shadow-cyan-500/10">
                <p className="text-sm font-bold text-cyan-300 mb-1">{entry?.name}</p>
                <p className="text-lg font-black text-white">{entry?.value} <span className="text-xs text-slate-400">müşteri</span></p>
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
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <defs>
                        {/* Glow filters for each color */}
                        {COLORS.map((color, index) => (
                            <filter key={index} id={`glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        ))}
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
                        cy="45%"
                        innerRadius={55}
                        outerRadius={90}
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
                    <Legend
                        verticalAlign="bottom"
                        height={50}
                        wrapperStyle={{ paddingTop: '10px' }}
                        formatter={(value) => (
                            <span className="text-xs text-slate-400 font-medium">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
