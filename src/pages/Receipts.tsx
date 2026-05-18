import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Receipt } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const BANKS = ['Bradesco','Itaú','Nubank','Banco do Brasil','Caixa','Santander','Inter','C6 Bank','Outro']

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function Receipts() {
  const { profile } = useAuth()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [formError, setFormError] = useState('')

  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState('')
  const [bank, setBank]     = useState(BANKS[0])
  const [notes, setNotes]   = useState('')
  const [file, setFile]     = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    let q = supabase
      .from('receipts')
      .select('*, profiles(id, full_name, email, role, active, created_at)')
      .order('created_at', { ascending: false })
    if (profile?.role !== 'admin') q = q.eq('user_id', profile?.id ?? '')
    const { data } = await q
    setReceipts((data as Receipt[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { if (profile) load() }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setFormError('Selecione um arquivo.'); return }
    setFormError('')
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${profile?.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file)
    if (uploadError) { setFormError('Erro no upload do arquivo.'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
    await supabase.from('receipts').insert({
      user_id: profile?.id, file_url: urlData.publicUrl, file_type: file.type,
      amount: parseFloat(amount.replace(',', '.')), deposit_date: date, bank, notes, status: 'pending',
    })

    setAmount(''); setDate(''); setBank(BANKS[0]); setNotes(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    load()
  }

  const statusEl = (s: string) => {
    if (s === 'approved') return <span className="status-approved">Aprovado</span>
    if (s === 'rejected') return <span className="status-rejected">Rejeitado</span>
    return <span className="status-pending">Pendente</span>
  }

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="page-header">
        <h1 className="page-title">Comprovantes</h1>
        <p className="page-subtitle">Envie e gerencie comprovantes de depósito</p>
      </div>

      {/* Upload form */}
      <div className="glass p-6 mb-5">
        <div className="label mb-4">Novo Comprovante</div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label block mb-1.5">Valor (R$)</label>
              <input className="input" type="text" value={amount} onChange={e => setAmount(e.target.value)}
                required placeholder="0,00" />
            </div>
            <div>
              <label className="label block mb-1.5">Data do depósito</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label block mb-1.5">Banco</label>
              <select className="input" value={bank} onChange={e => setBank(e.target.value)}>
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">Arquivo (PDF ou imagem)</label>
              <input
                ref={fileRef} type="file" accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-[12px] text-[#999] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-[#1A1A1A] file:text-white cursor-pointer"
              />
            </div>
            <div className="col-span-2">
              <label className="label block mb-1.5">Observação</label>
              <input className="input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          {formError && <p className="text-[12px] text-[#999] mb-3">{formError}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Enviando...' : 'Enviar comprovante'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {profile?.role === 'admin' && <th>Vendedor</th>}
              <th>Valor</th>
              <th>Data</th>
              <th>Banco</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[#CCCCCC] text-[13px]">Carregando...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[#CCCCCC] text-[13px]">Nenhum comprovante ainda</td></tr>
            ) : receipts.map(r => (
              <tr key={r.id}>
                {profile?.role === 'admin' && (
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[10px] font-semibold text-[#888] shrink-0">
                        {(r.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[#1A1A1A]">{r.profiles?.full_name ?? '—'}</span>
                    </div>
                  </td>
                )}
                <td><span className="font-semibold text-[#111]">{currency(Number(r.amount))}</span></td>
                <td className="text-[#888]">{format(new Date(r.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                <td className="text-[#888]">{r.bank}</td>
                <td>{statusEl(r.status)}</td>
                <td>
                  <button onClick={() => setSelected(r)} className="text-[12px] text-[#AAAAAA] hover:text-[#1A1A1A] transition-colors font-medium">
                    Ver →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Comprovante">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="label mb-1">Valor</div>
                <div className="value-lg">{currency(Number(selected.amount))}</div>
              </div>
              <div>
                <div className="label mb-1">Data</div>
                <div className="text-[14px] font-medium text-[#1A1A1A]">{format(new Date(selected.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
              </div>
              <div>
                <div className="label mb-1">Banco</div>
                <div className="text-[13px] text-[#555]">{selected.bank}</div>
              </div>
              <div>
                <div className="label mb-1">Status</div>
                {statusEl(selected.status)}
              </div>
              {selected.notes && (
                <div className="col-span-2">
                  <div className="label mb-1">Observação</div>
                  <div className="text-[13px] text-[#555]">{selected.notes}</div>
                </div>
              )}
            </div>
            <div className="divider" />
            <div>
              <div className="label mb-3">Arquivo</div>
              <FileViewer url={selected.file_url} fileType={selected.file_type} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
