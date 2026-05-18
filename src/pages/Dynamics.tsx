import { useEffect, useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable,
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

/* ─── Sortable Card ────────────────────────────── */
function KanbanCard({ card, onDetail, onAttachment }: {
  card: DynamicsCard
  onDetail: (c: DynamicsCard) => void
  onAttachment: (c: DynamicsCard) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        padding: '10px 12px',
        userSelect: 'none',
        cursor: 'grab',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {card.category && (
        <div style={{
          display: 'inline-block', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.07)', borderRadius: 5, padding: '2px 6px', marginBottom: 6,
        }}>
          {card.category}
        </div>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>{card.title}</div>
      {card.description && (
        <div style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {card.description}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDetail(card) }}
          style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          Detalhes
        </button>
        {card.attachment_url && (
          <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onAttachment(card) }}
            style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            📎 {card.attachment_name ?? 'Anexo'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Column ────────────────────────────────────── */
function Column({ colId, label, cards, onDetail, onAttachment, compact }: {
  colId: string; label: string; cards: DynamicsCard[]
  onDetail: (c: DynamicsCard) => void; onAttachment: (c: DynamicsCard) => void
  compact?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })

  return (
    <div style={{ minWidth: compact ? 162 : 224, maxWidth: compact ? 162 : 224, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
        <span style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)',
          borderRadius: 6, padding: '1px 6px', fontWeight: 500 }}>{cards.length}</span>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{
          flex: 1, minHeight: compact ? 120 : 100, display: 'flex', flexDirection: 'column', gap: 6,
          padding: 8, borderRadius: 14,
          border: isOver ? '1.5px dashed rgba(212,196,41,0.55)' : '1.5px dashed rgba(255,255,255,0.08)',
          background: isOver ? 'rgba(212,196,41,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'background 0.12s, border-color 0.12s',
        }}>
          {cards.map(c => (
            <KanbanCard key={c.id} card={c} onDetail={onDetail} onAttachment={onAttachment} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

/* ─── Overlay ────────────────────────────────────── */
function FloatingCard({ card }: { card: DynamicsCard }) {
  return (
    <div style={{
      background: 'rgba(30,30,36,0.95)', border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      padding: '10px 12px', width: 200,
      transform: 'rotate(2deg) scale(1.04)', opacity: 0.96, pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#FFF' }}>{card.title}</div>
      {card.description && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{card.description}</div>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export default function Dynamics() {
  const { profile } = useAuth()
  const [cards, setCards]         = useState<DynamicsCard[]>([])
  const [activeCard, setActiveCard] = useState<DynamicsCard | null>(null)
  const [detailCard, setDetailCard] = useState<DynamicsCard | null>(null)
  const [attachCard, setAttachCard] = useState<DynamicsCard | null>(null)
  const [modal, setModal]           = useState(false)

  const [title, setTitle]     = useState('')
  const [description, setDesc] = useState('')
  const [category, setCat]    = useState('')
  const [colId, setColId]     = useState(BOARD1_COLS[0].id)
  const [targetBoard, setTargetBoard] = useState<'board1' | 'board2'>('board1')
  const [file, setFile]       = useState<File | null>(null)
  const [saving, setSaving]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    const { data } = await supabase.from('dynamics_cards').select('*').order('position')
    setCards((data as DynamicsCard[]) ?? [])
  }
  useEffect(() => { load() }, [])

  const colCards = (board: 'board1' | 'board2', col: string) =>
    cards.filter(c => c.board === board && c.column_id === col).sort((a, b) => a.position - b.position)

  function resolveCol(id: string): { board: 'board1' | 'board2'; column_id: string } | null {
    if (BOARD1_COLS.some(c => c.id === id)) return { board: 'board1', column_id: id }
    if (BOARD2_COLS.some(c => c.id === id)) return { board: 'board2', column_id: id }
    const card = cards.find(c => c.id === id)
    return card ? { board: card.board, column_id: card.column_id } : null
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(cards.find(c => c.id === String(e.active.id)) ?? null)
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const dest = resolveCol(String(over.id))
    if (!dest) return
    const src = cards.find(c => c.id === String(active.id))
    if (!src) return
    if (src.board === dest.board && src.column_id === dest.column_id) return
    setCards(prev => prev.map(c =>
      c.id === String(active.id) ? { ...c, board: dest.board, column_id: dest.column_id } : c
    ))
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveCard(null)
    if (!over) return
    const dest = resolveCol(String(over.id))
    if (!dest) return
    const src = cards.find(c => c.id === String(active.id))
    if (!src) return
    const siblings = cards.filter(c => c.board === dest.board && c.column_id === dest.column_id && c.id !== String(active.id))
    const overCard = cards.find(c => c.id === String(over.id))
    const newPos   = overCard && overCard.id !== String(active.id) ? overCard.position : siblings.length
    setCards(prev => prev.map(c =>
      c.id === String(active.id) ? { ...c, board: dest.board, column_id: dest.column_id, position: newPos } : c
    ))
    await supabase.from('dynamics_cards')
      .update({ board: dest.board, column_id: dest.column_id, position: newPos })
      .eq('id', String(active.id))
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
    const pos = cards.filter(c => c.board === targetBoard && c.column_id === colId).length
    await supabase.from('dynamics_cards').insert({
      board: targetBoard, column_id: colId, title, description, category,
      attachment_url, attachment_name, attachment_type, position: pos, created_by: profile?.id,
    })
    setTitle(''); setDesc(''); setCat(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setModal(false); setSaving(false); load()
  }

  const sectionHeader = (label: string, sub: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ padding: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 1 }}>Dinâmicas</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Arraste dinâmicas para o planejamento semanal</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Nova dinâmica</button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>

        {/* Board 1 — Estratégias */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24, padding: 20, marginBottom: 16,
        }}>
          {sectionHeader('Estratégias', 'Organize suas dinâmicas por categoria')}
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
              {BOARD1_COLS.map(col => (
                <Column key={col.id} colId={col.id} label={col.label}
                  cards={colCards('board1', col.id)} onDetail={setDetailCard} onAttachment={setAttachCard} />
              ))}
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <span>↓</span>
            <span>Arraste para agendar na semana</span>
            <span>↓</span>
          </div>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Board 2 — Planejamento Semanal */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24, padding: 20,
        }}>
          {sectionHeader('Planejamento Semanal', 'Arraste dinâmicas para os dias da semana')}
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10, minWidth: 'max-content' }}>
              {BOARD2_COLS.map(col => (
                <Column key={col.id} colId={col.id} label={col.label}
                  cards={colCards('board2', col.id)} onDetail={setDetailCard} onAttachment={setAttachCard}
                  compact />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeCard ? <FloatingCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Drawers */}
      <Drawer open={!!detailCard} onClose={() => setDetailCard(null)} title="Detalhes">
        {detailCard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div><div className="label" style={{ marginBottom: 4 }}>Título</div><div style={{ fontSize: 16, fontWeight: 600, color: '#FFF' }}>{detailCard.title}</div></div>
            {detailCard.description && <div><div className="label" style={{ marginBottom: 4 }}>Descrição</div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{detailCard.description}</div></div>}
            {detailCard.category && <div><div className="label" style={{ marginBottom: 4 }}>Categoria</div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{detailCard.category}</div></div>}
            {detailCard.attachment_url && (
              <div>
                <div className="label" style={{ marginBottom: 10 }}>Anexo</div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}>
          <div className="glass-raised" style={{ width: '100%', maxWidth: 440, margin: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>Nova dinâmica</span>
              <button onClick={() => setModal(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent',
                border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Board</div>
                <select className="input" value={targetBoard} onChange={e => { setTargetBoard(e.target.value as 'board1'|'board2'); setColId(e.target.value === 'board1' ? BOARD1_COLS[0].id : BOARD2_COLS[0].id) }}>
                  <option value="board1">Estratégias</option>
                  <option value="board2">Planejamento Semanal</option>
                </select>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Coluna</div>
                <select className="input" value={colId} onChange={e => setColId(e.target.value)}>
                  {(targetBoard === 'board1' ? BOARD1_COLS : BOARD2_COLS).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Título</div>
                <input required className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome da dinâmica" />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Descrição</div>
                <textarea className="input" rows={3} value={description} onChange={e => setDesc(e.target.value)}
                  placeholder="Descreva a dinâmica..." style={{ resize: 'none' }} />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Categoria</div>
                <input className="input" value={category} onChange={e => setCat(e.target.value)} placeholder="ex: Meta, Reunião..." />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Anexo</div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="input" style={{ paddingTop: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
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
