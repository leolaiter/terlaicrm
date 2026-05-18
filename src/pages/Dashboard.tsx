import { useEffect, useState } from 'react'
import { subDays, startOfToday, format, eachDayOfInterval } from 'date-fns'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PeriodFilterBar } from '../components/ui/PeriodFilter'
import type { PeriodFilter, Receipt, Profile } from '../types'

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function getFrom(period: PeriodFilter): Date {
  const t = startOfToday()
  if (period === 'today') return t
  if (period === '7d')    return subDays(t, 7)
  if (period === '15d')   return subDays(t, 15)
  return subDays(t, 30)
}

interface SellerStat { id: string; full_name: string; total: number; count: number }

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm px-3 py-2">
      <div className="label mb-0.5">{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{currency(payload[0].value)}</div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, dark }: {
  icon: string; label: string; value: string; sub?: string; dark?: boolean
}) {
  return (
    <div className={dark ? 'glass-dark' : 'metric-card'} style={{ minHeight: 130 }}>
      <div className={`icon-circle ${dark ? 'icon-circle-dark' : ''}`}>{icon}</div>
      <div>
        <div className={`label mb-1.5 ${dark ? 'label-dark' : ''}`}>{label}</div>
        <div style={{
          fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1,
          color: dark ? '#FFFFFF' : '#111111',
        }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#AAAAAA', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<PeriodFilter>('7d')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [sellers, setSellers]   = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    async function load() {
      const fromStr = format(getFrom(period), 'yyyy-MM-dd')
      let q = supabase
        .from('receipts')
        .select('*, profiles(id, full_name, email, role, active, created_at)')
        .gte('deposit_date', fromStr)
        .eq('status', 'approved')
      if (profile!.role !== 'admin') q = q.eq('user_id', profile!.id)

      const [{ data: r }, { data: s }] = await Promise.all([
        q,
        profile!.role === 'admin'
          ? supabase.from('profiles').select('*').eq('role', 'vendedor').eq('active', true)
          : Promise.resolve({ data: [] }),
      ])
      setReceipts((r as Receipt[]) ?? [])
      setSellers((s as Profile[]) ?? [])
      setLoading(false)
    }
    load()
  }, [period, profile])

  const totalAmount   = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const uniqueSellers = new Set(receipts.map(r => r.user_id)).size
  const avgPerSeller  = uniqueSellers > 0 ? totalAmount / uniqueSellers : 0

  const sellerStats: SellerStat[] = sellers
    .map(s => {
      const sr = receipts.filter(r => r.user_id === s.id)
      return { id: s.id, full_name: s.full_name, total: sr.reduce((a, r) => a + Number(r.amount), 0), count: sr.length }
    })
    .sort((a, b) => b.total - a.total)

  const topPerformer = sellerStats[0]

  const today = startOfToday()
  const lineData = eachDayOfInterval({ start: getFrom(period), end: today }).map(day => {
    const key   = format(day, 'yyyy-MM-dd')
    const total = receipts.filter(r => r.deposit_date === key).reduce((s, r) => s + Number(r.amount), 0)
    return { date: format(day, 'dd/MM'), total }
  })

  const activeInPeriod = sellerStats.filter(s => s.count > 0).length
  const totalSellers   = Math.max(sellers.length, 1)
  const efficiency     = Math.round((activeInPeriod / totalSellers) * 100)
  const donutData = [
    { name: 'Ativos',   value: activeInPeriod },
    { name: 'Inativos', value: Math.max(totalSellers - activeInPeriod, 0) },
  ]

  return (
    <div className="p-8" style={{ maxWidth: 1440 }}>

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral de desempenho</p>
        </div>
        <PeriodFilterBar value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 rounded-full border-2 border-[#1A1A1A] border-t-transparent animate-spin opacity-20" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* KPI row — primeiro card dark como na referência */}
          <div className="grid grid-cols-4 gap-3">
            <KpiCard dark icon="◈" label="Total Depósitos"   value={currency(totalAmount)} />
            <KpiCard      icon="◉" label="Vendedores Ativos" value={String(uniqueSellers)} />
            <KpiCard      icon="◧" label="Comprovantes"      value={String(receipts.length)} />
            <KpiCard      icon="⊡" label="Média / Vendedor"  value={currency(avgPerSeller)} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-3 gap-3">

            {/* Area chart */}
            <div className="glass col-span-2 p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="label mb-1.5">Depósitos Diários</div>
                  <div className="value-xl">{currency(totalAmount)}</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={lineData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#1A1A1A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#CCCCCC', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#CCCCCC', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.06)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="total" stroke="#1A1A1A" strokeWidth={1.5}
                    fill="url(#areaGrad)" dot={false}
                    activeDot={{ r: 4, fill: '#1A1A1A', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut */}
            <div className="glass p-6 flex flex-col">
              <div className="label mb-1">Índice da Equipe</div>
              <p style={{ fontSize: 11, color: '#CCCCCC', marginTop: 2, marginBottom: 16 }}>Eficiência no período</p>
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <PieChart width={140} height={140}>
                    <Pie data={donutData} cx={65} cy={65} innerRadius={44} outerRadius={60}
                      dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      <Cell fill="#1A1A1A" />
                      <Cell fill="rgba(0,0,0,0.08)" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>{efficiency}%</span>
                    <span style={{ fontSize: 10, color: '#CCCCCC', marginTop: 2 }}>ativos</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#1A1A1A' }} />
                    <span style={{ fontSize: 11, color: '#999' }}>{activeInPeriod} ativos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.12)' }} />
                    <span style={{ fontSize: 11, color: '#999' }}>{totalSellers - activeInPeriod} inativos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-3 gap-3">

            {/* Top performer — dark card */}
            <div className="glass-dark p-6">
              <div className="label label-dark mb-4">Top Performer</div>
              {topPerformer ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                    {topPerformer.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {topPerformer.full_name}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.03em', marginTop: 2 }}>
                      {currency(topPerformer.total)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {topPerformer.count} depósitos
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Sem dados no período</div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="glass p-6 col-span-2">
              <div className="label mb-5">Ranking de Vendedores</div>
              {sellerStats.length === 0 ? (
                <div style={{ fontSize: 13, color: '#CCCCCC' }}>Sem dados no período</div>
              ) : (
                <div className="space-y-4">
                  {sellerStats.slice(0, 5).map((s, i) => {
                    const pct = topPerformer?.total ? (s.total / topPerformer.total) * 100 : 0
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span style={{ fontSize: 11, fontWeight: 500, width: 16, textAlign: 'center', flexShrink: 0,
                          color: i === 0 ? '#1A1A1A' : '#CCCCCC' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, color: '#444', width: 128, flexShrink: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.full_name}
                        </span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: i === 0 ? '#1A1A1A' : 'rgba(0,0,0,0.18)' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', width: 110, textAlign: 'right', flexShrink: 0 }}>
                          {currency(s.total)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
