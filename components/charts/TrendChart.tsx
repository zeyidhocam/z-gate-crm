"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface TrendData {
    date: string
    value: number
}

interface TrendChartProps {
    data: TrendData[]
    title?: string
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: Array<{ value: number, payload: any }>, label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0c1929] border border-cyan-500/30 rounded-xl px-4 py-3 shadow-xl shadow-cyan-500/10">
                <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
                <p className="text-lg font-black text-cyan-300">{payload[0].value} <span className="text-xs text-slate-400">kayıt</span></p>
            </div>
        )
    }
    return null
}

// Custom dot component
const CustomDot = (props: { cx?: number, cy?: number, value?: number }) => {
    const { cx, cy, value } = props
    if (value === 0) return null
    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="#22d3ee"
            stroke="#0c1929"
            strokeWidth={2}
            style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.6))' }}
        />
    )
}

export function TrendChart({ data, title }: TrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
                Veri yok
            </div>
        )
    }

    // Veri varsa max değeri bul
    const maxValue = Math.max(...data.map(d => d.value), 1)

    return (
        <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                        {/* Premium gradient */}
                        <linearGradient id="trendGradientPremium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                            <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                        {/* Glow filter */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e3a5f"
                        strokeOpacity={0.3}
                        vertical={false}
                    />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                        interval="preserveStartEnd"
                        tickMargin={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                        domain={[0, maxValue + 1]}
                        allowDecimals={false}
                        tickMargin={5}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        fill="url(#trendGradientPremium)"
                        dot={<CustomDot />}
                        activeDot={{
                            r: 6,
                            fill: "#22d3ee",
                            stroke: "#fff",
                            strokeWidth: 2,
                            style: { filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))' }
                        }}
                        animationDuration={1000}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.3))' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
