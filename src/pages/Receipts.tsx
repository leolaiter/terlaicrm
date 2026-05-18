import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Receipt } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const BANKS = ['Bradesco', 'Itaú', 'Nubank', 'Banco do Brasil', 'Caixa', 'Santander', 'Inter', 'C6 Bank', 'Outro']

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function statusLabel(s: string) {
  if (s === 'approved') return { label: 'Aprovado', cls: 'text-[#1A1A1A] bg-[#F0F0F0]' }
  if (s === 'rejected') return { label: 'Rejeitado', cls: 'text-[#999] bg-[#F0F0F0] line-through' }
  return { label: 'Pendente', cls: 'text-[#AAAAAA] bg-[#F8F8F8]' }
}

export default function Receipts() {
  const { profile } = useAuth()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Receipt | null>(null)

  // form state
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [bank, setBank] = useState(BANKS[0])
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadReceipts() {
    let q = supabase
      .from('receipts')
      .select('*, profiles(id, full_name, email, role, active, created_at)')
      .order('created_at', { ascending: false })

    if (profile?.role !== 'admin') q = q.eq('user_id', profile?.id ?? '')
    const { data } = await q
    setReceipts((data as Receipt[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (profile) loadReceipts()
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setFormError('Selecione um arquivo.'); return }
    setFormError('')
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${profile?.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file)
    if (uploadError) { setFormError('Erro no upload.'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)

    await supabase.from('receipts').insert({
      user_id: profile?.id,
      file_url: urlData.publicUrl,
      file_type: file.type,
      amount: parseFloat(amount.replace(',', '.')),
      deposit_date: date,
      bank,
      notes,
      status: 'pending',
    })

    setAmount(''); setDate(''); setBank(BANKS[0]); setNotes(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    loadReceipts()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[#1A1A1A]">Comprovantes</h1>
        <p className="text-sm text-[#999] mt-0.5">Envie e visualize comprovantes de depósito</p>
      </div>

      {/* Upload form */}
      <div className="glass-card p-6 mb-6">
        <div className="label-text mb-4">NOVO COMPROVANTE</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text block mb-1.5">VALOR (R$)</label>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>
          <div>
            <label className="label-text block mb-1.5">DATA DO DEPÓSITO</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>
          <div>
            <label className="label-text block mb-1.5">BANCO</label>
            <select
              value={bank}
              onChange={e => setBank(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            >
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text block mb-1.5">ARQUIVO (PDF ou IMAGEM)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[#999] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1A1A1A] file:text-white cursor-pointer"
            />
          </div>
          <div className="col-span-2">
            <label className="label-text block mb-1.5">OBSERVAÇÃO</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>
          {formError && <p className="col-span-2 text-xs text-[#999]">{formError}</p>}
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Enviar comprovante'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              {profile?.role === 'admin' && <th className="px-4 py-3 text-left label-text">VENDEDOR</th>}
              <th className="px-4 py-3 text-left label-text">VALOR</th>
              <th className="px-4 py-3 text-left label-text">DATA</th>
              <th className="px-4 py-3 text-left label-text">BANCO</th>
              <th className="px-4 py-3 text-left label-text">STATUS</th>
              <th className="px-4 py-3 text-left label-text">AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#999]">Carregando...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#999]">Nenhum comprovante</td></tr>
            ) : receipts.map(r => {
              const st = statusLabel(r.status)
              return (
                <tr key={r.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                  {profile?.role === 'admin' && (
                    <td className="px-4 py-3 text-sm text-[#1A1A1A]">{r.profiles?.full_name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-[#111111]">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-3 text-sm text-[#999]">{format(new Date(r.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-[#999]">{r.bank}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(r)}
                      className="text-xs text-[#1A1A1A] hover:underline font-medium"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Comprovante">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label-text mb-1">VALOR</div>
                <div className="font-semibold text-[#111]">{fmt(Number(selected.amount))}</div>
              </div>
              <div>
                <div className="label-text mb-1">DATA</div>
                <div className="text-sm text-[#1A1A1A]">{format(new Date(selected.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
              </div>
              <div>
                <div className="label-text mb-1">BANCO</div>
                <div className="text-sm text-[#1A1A1A]">{selected.bank}</div>
              </div>
              <div>
                <div className="label-text mb-1">STATUS</div>
                <div className="text-sm text-[#1A1A1A]">{statusLabel(selected.status).label}</div>
              </div>
              {selected.notes && (
                <div className="col-span-2">
                  <div className="label-text mb-1">OBSERVAÇÃO</div>
                  <div className="text-sm text-[#1A1A1A]">{selected.notes}</div>
                </div>
              )}
            </div>
            <div>
              <div className="label-text mb-3">ARQUIVO</div>
              <FileViewer url={selected.file_url} fileType={selected.file_type} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
