import { useEffect, useState } from 'react'
import { subDays, startOfToday, format, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PeriodFilterBar } from '../components/ui/PeriodFilter'
import { PeriodFilter, Receipt, Profile } from '../types'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function getDateRange(period: PeriodFilter): Date {
  const today = startOfToday()
  if (period === 'today') return today
  if (period === '7d') return subDays(today, 7)
  if (period === '15d') return subDays(today, 15)
  return subDays(today, 30)
}

interface SellerStats {
  id: string
  full_name: string
  total: number
  count: number
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<PeriodFilter>('7d')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [sellers, setSellers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = getDateRange(period)
      const fromStr = format(from, 'yyyy-MM-dd')

      let q = supabase
        .from('receipts')
        .select('*, profiles(id, full_name, email, role, active, created_at)')
        .gte('deposit_date', fromStr)
        .eq('status', 'approved')

      if (profile?.role !== 'admin') q = q.eq('user_id', profile?.id ?? '')

      const { data } = await q
      setReceipts((data as Receipt[]) ?? [])

      if (profile?.role === 'admin') {
        const { data: sellersData } = await supabase.from('profiles').select('*').eq('role', 'vendedor').eq('active', true)
        setSellers(sellersData ?? [])
      }
      setLoading(false)
    }
    if (profile) load()
  }, [period, profile])

  const totalAmount = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const uniqueSellers = new Set(receipts.map(r => r.user_id)).size

  const sellerStats: SellerStats[] = sellers.map(s => {
    const sellerReceipts = receipts.filter(r => r.user_id === s.id)
    return { id: s.id, full_name: s.full_name, total: sellerReceipts.reduce((a, r) => a + Number(r.amount), 0), count: sellerReceipts.length }
  }).sort((a, b) => b.total - a.total)

  const topPerformer = sellerStats[0]
  const avgPerSeller = uniqueSellers > 0 ? totalAmount / uniqueSellers : 0

  // Line chart data
  const today = startOfToday()
  const from = getDateRange(period)
  const days = eachDayOfInterval({ start: from, end: today })
  const lineData = days.map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const dayTotal = receipts
      .filter(r => r.deposit_date === key)
      .reduce((s, r) => s + Number(r.amount), 0)
    return { date: format(day, 'dd/MM', { locale: ptBR }), total: dayTotal }
  })

  // Donut — eficiência: sellers with at least 1 receipt vs total
  const activeInPeriod = sellerStats.filter(s => s.count > 0).length
  const totalSellers = Math.max(sellers.length, 1)
  const efficiency = Math.round((activeInPeriod / totalSellers) * 100)
  const donutData = [
    { name: 'Ativos', value: activeInPeriod },
    { name: 'Inativos', value: Math.max(totalSellers - activeInPeriod, 0) },
  ]

  const KPI = ({ label, value }: { label: string; value: string }) => (
    <div className="glass-card p-5">
      <div className="label-text mb-2">{label}</div>
      <div className="value-large">{value}</div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Dashboard</h1>
          <p className="text-sm text-[#999] mt-0.5">Visão geral de desempenho</p>
        </div>
        <PeriodFilterBar value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-[#999] text-sm">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPI label="TOTAL DEPÓSITOS" value={fmt(totalAmount)} />
            <KPI label="VENDEDORES ATIVOS" value={String(uniqueSellers)} />
            <KPI label="COMPROVANTES" value={String(receipts.length)} />
            <KPI label="MÉDIA / VENDEDOR" value={fmt(avgPerSeller)} />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Line chart */}
            <div className="glass-card p-5 col-span-2">
              <div className="label-text mb-4">DEPÓSITOS DIÁRIOS</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#AAAAAA' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), 'Total']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#1A1A1A" strokeWidth={2} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut */}
            <div className="glass-card p-5 flex flex-col items-center justify-center">
              <div className="label-text mb-4 self-start">ÍNDICE DA EQUIPE</div>
              <PieChart width={160} height={160}>
                <Pie data={donutData} cx={75} cy={75} innerRadius={50} outerRadius={70} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="#1A1A1A" />
                  <Cell fill="#E5E5E5" />
                </Pie>
              </PieChart>
              <div className="text-center -mt-2">
                <div className="value-large text-3xl">{efficiency}%</div>
                <div className="text-xs text-[#999]">eficiência</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Top Performer */}
            <div className="glass-card p-5">
              <div className="label-text mb-3">TOP PERFORMER</div>
              {topPerformer ? (
                <>
                  <div className="text-base font-semibold text-[#1A1A1A]">{topPerformer.full_name}</div>
                  <div className="value-large mt-1">{fmt(topPerformer.total)}</div>
                  <div className="text-xs text-[#999] mt-1">{topPerformer.count} depósitos</div>
                </>
              ) : (
                <div className="text-sm text-[#999]">Sem dados no período</div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="glass-card p-5 col-span-2">
              <div className="label-text mb-4">RANKING VENDEDORES</div>
              {sellerStats.length === 0 ? (
                <div className="text-sm text-[#999]">Sem dados no período</div>
              ) : (
                <div className="space-y-3">
                  {sellerStats.slice(0, 5).map((s, i) => {
                    const pct = topPerformer ? (s.total / topPerformer.total) * 100 : 0
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs text-[#AAAAAA] w-4">{i + 1}</span>
                        <span className="text-sm text-[#1A1A1A] w-32 truncate">{s.full_name}</span>
                        <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-[#1A1A1A] w-24 text-right">{fmt(s.total)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
