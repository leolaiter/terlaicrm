import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Profile, Receipt } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function statusLabel(s: string) {
  if (s === 'approved') return { label: 'Aprovado', cls: 'bg-[#E8E8E8] text-[#1A1A1A]' }
  if (s === 'rejected') return { label: 'Rejeitado', cls: 'bg-[#F0F0F0] text-[#999]' }
  return { label: 'Pendente', cls: 'bg-[#F8F8F8] text-[#AAAAAA]' }
}

export default function Admin() {
  const [users, setUsers] = useState<Profile[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'receipts'>('users')
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)

  async function loadData() {
    const [{ data: u }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('receipts').select('*, profiles(id, full_name, email, role, active, created_at)').order('created_at', { ascending: false }),
    ])
    setUsers((u as Profile[]) ?? [])
    setReceipts((r as Receipt[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function updateRole(userId: string, role: 'admin' | 'vendedor') {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  async function toggleActive(user: Profile) {
    await supabase.from('profiles').update({ active: !user.active }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u))
  }

  async function updateReceiptStatus(id: string, status: 'approved' | 'rejected') {
    await supabase.from('receipts').update({ status }).eq('id', id)
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (selectedReceipt?.id === id) setSelectedReceipt(prev => prev ? { ...prev, status } : null)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[#1A1A1A]">Administração</h1>
        <p className="text-sm text-[#999] mt-0.5">Gerencie usuários e comprovantes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#F2F2F0] border border-[#E5E5E5] w-fit mb-6">
        {(['users', 'receipts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t ? 'bg-[#1A1A1A] text-white' : 'text-[#AAAAAA] hover:text-[#1A1A1A]'
            }`}
          >
            {t === 'users' ? 'Usuários' : 'Comprovantes'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-[#999]">Carregando...</div>
      ) : tab === 'users' ? (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-4 py-3 text-left label-text">NOME</th>
                <th className="px-4 py-3 text-left label-text">E-MAIL</th>
                <th className="px-4 py-3 text-left label-text">ROLE</th>
                <th className="px-4 py-3 text-left label-text">STATUS</th>
                <th className="px-4 py-3 text-left label-text">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[#1A1A1A]">{u.full_name}</td>
                  <td className="px-4 py-3 text-sm text-[#999]">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value as 'admin' | 'vendedor')}
                      className="text-xs px-2 py-1 rounded border border-[#E5E5E5] bg-white text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-[#E8E8E8] text-[#1A1A1A]' : 'bg-[#F0F0F0] text-[#999]'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      className="text-xs text-[#999] hover:text-[#1A1A1A] transition-colors font-medium"
                    >
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="px-4 py-3 text-left label-text">VENDEDOR</th>
                <th className="px-4 py-3 text-left label-text">VALOR</th>
                <th className="px-4 py-3 text-left label-text">DATA</th>
                <th className="px-4 py-3 text-left label-text">BANCO</th>
                <th className="px-4 py-3 text-left label-text">STATUS</th>
                <th className="px-4 py-3 text-left label-text">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#999]">Nenhum comprovante</td></tr>
              ) : receipts.map(r => {
                const st = statusLabel(r.status)
                return (
                  <tr key={r.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 text-sm text-[#1A1A1A]">{r.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#111]">{fmt(Number(r.amount))}</td>
                    <td className="px-4 py-3 text-sm text-[#999]">{format(new Date(r.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-[#999]">{r.bank}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedReceipt(r)} className="text-xs text-[#999] hover:text-[#1A1A1A] transition-colors font-medium">Ver</button>
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => updateReceiptStatus(r.id, 'approved')} className="text-xs font-medium text-[#1A1A1A] hover:underline">Aprovar</button>
                            <button onClick={() => updateReceiptStatus(r.id, 'rejected')} className="text-xs font-medium text-[#999] hover:underline">Rejeitar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Comprovante">
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="label-text mb-1">VENDEDOR</div><div className="text-sm font-medium text-[#1A1A1A]">{selectedReceipt.profiles?.full_name}</div></div>
              <div><div className="label-text mb-1">VALOR</div><div className="font-semibold text-[#111]">{fmt(Number(selectedReceipt.amount))}</div></div>
              <div><div className="label-text mb-1">DATA</div><div className="text-sm">{format(new Date(selectedReceipt.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</div></div>
              <div><div className="label-text mb-1">BANCO</div><div className="text-sm">{selectedReceipt.bank}</div></div>
            </div>
            {selectedReceipt.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateReceiptStatus(selectedReceipt.id, 'approved')} className="flex-1 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors">Aprovar</button>
                <button onClick={() => updateReceiptStatus(selectedReceipt.id, 'rejected')} className="flex-1 py-2 rounded-lg border border-[#E5E5E5] text-sm text-[#999] hover:text-[#1A1A1A] transition-colors">Rejeitar</button>
              </div>
            )}
            <div>
              <div className="label-text mb-3">ARQUIVO</div>
              <FileViewer url={selectedReceipt.file_url} fileType={selectedReceipt.file_type} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
