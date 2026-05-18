import { useEffect, useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { DynamicsCard } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const BOARD1_COLS = [
  { id: 'alavancagem', label: 'Alavancagem de Capital' },
  { id: 'recuperacao', label: 'Recuperação de Capital' },
  { id: 'entrada',     label: 'Entrada Assertiva' },
  { id: 'disparos',    label: 'Disparos' },
]
const BOARD2_COLS = [
  { id: 'SEG', label: 'Seg' }, { id: 'TER', label: 'Ter' }, { id: 'QUA', label: 'Qua' },
  { id: 'QUI', label: 'Qui' }, { id: 'SEX', label: 'Sex' }, { id: 'SAB', label: 'Sáb' },
  { id: 'DOM', label: 'Dom' },
]

/* ─── Card ──────────────────────────────────────── */
function KanbanCard({
  card, onDetail, onAttachment,
}: {
  card: DynamicsCard
  onDetail: (c: DynamicsCard) => void
  onAttachment: (c: DynamicsCard) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 10,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        userSelect: 'none',
        cursor: 'grab',
        padding: 12,
      }}
      {...attributes}
      {...listeners}
    >
      {card.category && (
        <div className="inline-flex items-center px-1.5 py-0.5 rounded mb-2"
          style={{ background: '#F5F5F5', fontSize: 10, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {card.category}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.35 }}>{card.title}</div>
      {card.description && (
        <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 4, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {card.description}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2.5">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDetail(card) }}
          style={{ fontSize: 11, color: '#CCCCCC', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          className="hover:!text-[#1A1A1A] transition-colors"
        >
          Detalhes
        </button>
        {card.attachment_url && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onAttachment(card) }}
            style={{ fontSize: 11, color: '#CCCCCC', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            className="hover:!text-[#1A1A1A] transition-colors"
          >
            📎 {card.attachment_name ?? 'Anexo'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Column ─────────────────────────────────────── */
function Column({
  colId, label, cards, onDetail, onAttachment,
}: {
  colId: string; label: string; cards: DynamicsCard[]
  onDetail: (c: DynamicsCard) => void; onAttachment: (c: DynamicsCard) => void
}) {
  return (
    <div style={{ minWidth: 230, maxWidth: 230, display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#CCCCCC', background: '#F5F5F5',
          borderRadius: 6, padding: '1px 7px', fontWeight: 500 }}>{cards.length}</span>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div
          data-column-id={colId}
          style={{
            flex: 1, minHeight: 80, display: 'flex', flexDirection: 'column', gap: 6,
            padding: 8, borderRadius: 10,
            border: '1.5px dashed rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.4)',
          }}
        >
          {cards.map(c => (
            <KanbanCard key={c.id} card={c} onDetail={onDetail} onAttachment={onAttachment} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

/* ─── Drag overlay card ──────────────────────────── */
function FloatingCard({ card }: { card: DynamicsCard }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10,
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: 12, width: 220,
      transform: 'rotate(2deg) scale(1.03)', opacity: 0.95, pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{card.title}</div>
      {card.description && <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 4 }}>{card.description}</div>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export default function Dynamics() {
  const { profile } = useAuth()
  const [cards, setCards] = useState<DynamicsCard[]>([])
  const [activeCard, setActiveCard] = useState<DynamicsCard | null>(null)
  const [detailCard, setDetailCard] = useState<DynamicsCard | null>(null)
  const [attachCard, setAttachCard] = useState<DynamicsCard | null>(null)
  const [board, setBoard] = useState<'board1' | 'board2'>('board1')
  const [modal, setModal] = useState(false)

  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [category, setCat]      = useState('')
  const [colId, setColId]       = useState(BOARD1_COLS[0].id)
  const [file, setFile]         = useState<File | null>(null)
  const [saving, setSaving]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    const { data } = await supabase.from('dynamics_cards').select('*').order('position')
    setCards((data as DynamicsCard[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const colCards = (b: 'board1' | 'board2', col: string) =>
    cards.filter(c => c.board === b && c.column_id === col).sort((a, b) => a.position - b.position)

  const findCard = (id: string) => cards.find(c => c.id === id)

  const colOf = (id: string): { board: 'board1' | 'board2'; column_id: string } | null => {
    if (BOARD1_COLS.find(c => c.id === id)) return { board: 'board1', column_id: id }
    if (BOARD2_COLS.find(c => c.id === id)) return { board: 'board2', column_id: id }
    const card = findCard(id)
    if (!card) return null
    return { board: card.board, column_id: card.column_id }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(findCard(String(e.active.id)) ?? null)
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const from = colOf(String(active.id))
    const to   = colOf(String(over.id))
    if (!from || !to) return
    if (from.board === to.board && from.column_id === to.column_id) return
    setCards(prev => prev.map(c =>
      c.id === String(active.id) ? { ...c, board: to.board, column_id: to.column_id } : c
    ))
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveCard(null)
    if (!over || active.id === over.id) return
    const to = colOf(String(over.id))
    if (!to) return
    const overCard = findCard(String(over.id))
    const newPos = overCard ? overCard.position : cards.filter(c => c.board === to.board && c.column_id === to.column_id).length
    setCards(prev => prev.map(c =>
      c.id === String(active.id) ? { ...c, ...to, position: newPos } : c
    ))
    await supabase.from('dynamics_cards').update({ board: to.board, column_id: to.column_id, position: newPos }).eq('id', String(active.id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    let attachment_url = null, attachment_name = null, attachment_type = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${profile?.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('dynamics-attachments').upload(path, file)
      if (!error) {
        attachment_url  = supabase.storage.from('dynamics-attachments').getPublicUrl(path).data.publicUrl
        attachment_name = file.name
        attachment_type = file.type
      }
    }
    const pos = cards.filter(c => c.board === board && c.column_id === colId).length
    await supabase.from('dynamics_cards').insert({
      board, column_id: colId, title, description, category,
      attachment_url, attachment_name, attachment_type, position: pos, created_by: profile?.id,
    })
    setTitle(''); setDesc(''); setCat(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setModal(false); setSaving(false); load()
  }

  const cols = board === 'board1' ? BOARD1_COLS : BOARD2_COLS

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Dinâmicas</h1>
          <p className="page-subtitle">Organize estratégias em boards interativos</p>
        </div>
        <button onClick={() => { setModal(true); setColId(cols[0].id) }} className="btn-primary">
          + Nova dinâmica
        </button>
      </div>

      {/* Board tabs */}
      <div className="pill-group mb-6">
        {(['board1', 'board2'] as const).map(b => (
          <button key={b} onClick={() => setBoard(b)} className={`pill ${board === b ? 'pill-active' : ''}`}>
            {b === 'board1' ? 'Estratégias' : 'Planejamento Semanal'}
          </button>
        ))}
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {cols.map(col => (
              <Column key={col.id} colId={col.id} label={col.label}
                cards={colCards(board, col.id)} onDetail={setDetailCard} onAttachment={setAttachCard} />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? <FloatingCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Drawers */}
      <Drawer open={!!detailCard} onClose={() => setDetailCard(null)} title="Detalhes">
        {detailCard && (
          <div className="space-y-5">
            <div><div className="label mb-1">Título</div><div className="text-[15px] font-semibold text-[#1A1A1A]">{detailCard.title}</div></div>
            {detailCard.description && <div><div className="label mb-1">Descrição</div><div className="text-[13px] text-[#666]">{detailCard.description}</div></div>}
            {detailCard.category && <div><div className="label mb-1">Categoria</div><div className="text-[13px] text-[#666]">{detailCard.category}</div></div>}
            {detailCard.attachment_url && (
              <div><div className="label mb-3">Anexo</div>
                <FileViewer url={detailCard.attachment_url} fileType={detailCard.attachment_type ?? ''} name={detailCard.attachment_name ?? undefined} />
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!attachCard} onClose={() => setAttachCard(null)} title={attachCard?.attachment_name ?? 'Anexo'} width="560px">
        {attachCard?.attachment_url && (
          <FileViewer url={attachCard.attachment_url} fileType={attachCard.attachment_type ?? ''} name={attachCard.attachment_name ?? undefined} />
        )}
      </Drawer>

      {/* New card modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}>
          <div className="glass w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[14px] font-semibold text-[#1A1A1A]">Nova dinâmica</span>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#AAAAAA] hover:bg-[#F5F5F5] hover:text-[#1A1A1A] transition-all">×</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label block mb-1.5">Coluna</label>
                <select className="input" value={colId} onChange={e => setColId(e.target.value)}>
                  {cols.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">Título</label>
                <input required className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome da dinâmica" />
              </div>
              <div>
                <label className="label block mb-1.5">Descrição</label>
                <textarea className="input resize-none" rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Descreva a dinâmica..." />
              </div>
              <div>
                <label className="label block mb-1.5">Categoria</label>
                <input className="input" value={category} onChange={e => setCat(e.target.value)} placeholder="ex: Meta, Reunião..." />
              </div>
              <div>
                <label className="label block mb-1.5">Anexo</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[12px] text-[#999] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-[#1A1A1A] file:text-white cursor-pointer" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Criar card'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
