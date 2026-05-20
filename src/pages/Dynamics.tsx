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
import { useProject } from '../hooks/useProject'
import type { DynamicsCard, DynamicsCategory } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const BOARD2_COLS = [
  { id: 'SEG', label: 'Seg' }, { id: 'TER', label: 'Ter' }, { id: 'QUA', label: 'Qua' },
  { id: 'QUI', label: 'Qui' }, { id: 'SEX', label: 'Sex' }, { id: 'SAB', label: 'Sáb' },
  { id: 'DOM', label: 'Dom' },
]

const PRESET_COLORS = ['#3B82F6', '#F97316', '#22C55E', '#EAB308', '#A855F7', '#EC4899', '#06B6D4', '#EF4444', '#84CC16', '#F59E0B']

function CategoryBadge({ categoryKey, categories }: { categoryKey?: string | null; categories: DynamicsCategory[] }) {
  const cat = categoryKey ? categories.find(c => c.slug === categoryKey) : null
  if (!cat) return (
    <div style={{
      display: 'inline-block', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 5, padding: '2px 7px', marginBottom: 6,
    }}>sem categoria</div>
  )
  return (
    <div style={{
      display: 'inline-block', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      color: '#FFF', background: cat.color,
      borderRadius: 5, padding: '2px 7px', marginBottom: 6,
    }}>
      {cat.name}
    </div>
  )
}

/* ─── Sortable Card ────────────────────────────── */
function KanbanCard({ card, onDetail, onAttachment, onDelete, canManage, categories }: {
  card: DynamicsCard
  onDetail: (c: DynamicsCard) => void
  onAttachment: (c: DynamicsCard) => void
  onDelete: (c: DynamicsCard) => void
  canManage: boolean
  categories: DynamicsCategory[]
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
      {card.category && <CategoryBadge categoryKey={card.category} categories={categories} />}
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)', lineHeight: 1.35 }}>{card.title}</div>
      {card.description && (
        <div style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {card.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDetail(card) }}
          style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          Detalhes
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {card.attachment_url && (
            <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onAttachment(card) }}
              title="Ver anexo"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 7,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
                cursor: 'pointer', fontSize: 12,
              }}>
              📎
            </button>
          )}
          {canManage && (
          <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(card) }}
            title="Excluir dinâmica"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 7,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.30)',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(239,68,68,0.15)'
              el.style.borderColor = 'rgba(239,68,68,0.30)'
              el.style.color = 'rgba(239,68,68,0.80)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,255,255,0.04)'
              el.style.borderColor = 'rgba(255,255,255,0.07)'
              el.style.color = 'rgba(255,255,255,0.30)'
            }}
          >
            🗑
          </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Column ────────────────────────────────────── */
function Column({ colId, label, cards, onDetail, onAttachment, onDelete, compact, canManage, categories, onEditCategory, onDeleteCategory, color }: {
  colId: string; label: string; cards: DynamicsCard[]
  onDetail: (c: DynamicsCard) => void; onAttachment: (c: DynamicsCard) => void
  onDelete: (c: DynamicsCard) => void; compact?: boolean
  canManage: (c: DynamicsCard) => boolean
  categories: DynamicsCategory[]
  onEditCategory?: () => void
  onDeleteCategory?: () => void
  color?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })

  // Mostra ~5 cards visíveis (~50px cada), o resto rola
  const MAX_VISIBLE_CARDS = 5
  const CARD_HEIGHT = compact ? 60 : 80
  const maxHeight = MAX_VISIBLE_CARDS * CARD_HEIGHT + 20

  return (
    <div style={{ minWidth: compact ? 162 : 224, maxWidth: compact ? 162 : 224, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          {color && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: compact ? 11 : 12, fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)',
            borderRadius: 6, padding: '1px 6px', fontWeight: 500 }}>{cards.length}</span>
          {onEditCategory && (
            <button onClick={onEditCategory} title="Editar setor"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2, fontSize: 11 }}>
              ✎
            </button>
          )}
          {onDeleteCategory && (
            <button onClick={onDeleteCategory} title="Excluir setor"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2, fontSize: 11 }}>
              ×
            </button>
          )}
        </div>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{
          minHeight: compact ? 120 : 100,
          maxHeight: cards.length > MAX_VISIBLE_CARDS ? maxHeight : undefined,
          overflowY: cards.length > MAX_VISIBLE_CARDS ? 'auto' : undefined,
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: 8, borderRadius: 14,
          border: isOver ? '1.5px dashed rgba(212,196,41,0.55)' : '1.5px dashed rgba(255,255,255,0.08)',
          background: isOver ? 'rgba(212,196,41,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'background 0.12s, border-color 0.12s',
        }}>
          {cards.map(c => (
            <KanbanCard key={c.id} card={c} onDetail={onDetail} onAttachment={onAttachment} onDelete={onDelete} canManage={canManage(c)} categories={categories} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

/* ─── Overlay ────────────────────────────────────── */
function FloatingCard({ card, categories }: { card: DynamicsCard; categories: DynamicsCategory[] }) {
  return (
    <div style={{
      background: 'rgba(30,30,36,0.95)', border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      padding: '10px 12px', width: 200,
      transform: 'rotate(2deg) scale(1.04)', opacity: 0.96, pointerEvents: 'none',
    }}>
      {card.category && <CategoryBadge categoryKey={card.category} categories={categories} />}
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#FFF' }}>{card.title}</div>
      {card.description && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{card.description}</div>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export default function Dynamics() {
  const { profile } = useAuth()
  const { activeProject } = useProject()
  const [cards, setCards]           = useState<DynamicsCard[]>([])
  const [categories, setCategories] = useState<DynamicsCategory[]>([])
  const [activeCard, setActiveCard] = useState<DynamicsCard | null>(null)
  const [dragOrigin, setDragOrigin] = useState<{ board: 'board1'|'board2'; column_id: string; position: number } | null>(null)
  const [detailCard, setDetailCard] = useState<DynamicsCard | null>(null)
  const [attachCard, setAttachCard] = useState<DynamicsCard | null>(null)
  const [modal, setModal]           = useState(false)
  const [editingCard, setEditingCard] = useState<DynamicsCard | null>(null)
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing?: DynamicsCategory | null }>({ open: false })

  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCat]          = useState('')
  const [colId, setColId]           = useState('')
  const [targetBoard, setTargetBoard] = useState<'board1' | 'board2'>('board1')
  const [file, setFile]             = useState<File | null>(null)
  const [saving, setSaving]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    if (!activeProject) { setCards([]); setCategories([]); return }
    const [{ data: c }, { data: cats }] = await Promise.all([
      supabase.from('dynamics_cards').select('*').eq('project_id', activeProject.id).order('position'),
      supabase.from('dynamics_categories').select('*').eq('project_id', activeProject.id).order('position'),
    ])
    setCards((c as DynamicsCard[]) ?? [])
    const catList = (cats as DynamicsCategory[]) ?? []
    setCategories(catList)
    if (catList.length > 0 && !colId) {
      setColId(catList[0].slug)
      setCat(catList[0].slug)
    }
  }
  useEffect(() => { load() }, [activeProject?.id])

  async function handleDelete(card: DynamicsCard) {
    if (!window.confirm(`Excluir "${card.title}"?`)) return
    setCards(prev => prev.filter(c => c.id !== card.id))
    await supabase.from('dynamics_cards').delete().eq('id', card.id)
  }

  async function handleDeleteCategory(cat: DynamicsCategory) {
    const cardsInCategory = cards.filter(c => c.column_id === cat.slug).length
    const msg = cardsInCategory > 0
      ? `Excluir setor "${cat.name}"? Os ${cardsInCategory} card(s) existente(s) ficarão sem categoria.`
      : `Excluir setor "${cat.name}"?`
    if (!window.confirm(msg)) return
    await supabase.from('dynamics_categories').delete().eq('id', cat.id)
    await load()
  }

  const colCards = (board: 'board1' | 'board2', col: string) =>
    cards.filter(c => c.board === board && c.column_id === col).sort((a, b) => a.position - b.position)

  function resolveCol(id: string): { board: 'board1' | 'board2'; column_id: string } | null {
    if (categories.some(c => c.slug === id)) return { board: 'board1', column_id: id }
    if (BOARD2_COLS.some(c => c.id === id)) return { board: 'board2', column_id: id }
    const card = cards.find(c => c.id === id)
    return card ? { board: card.board, column_id: card.column_id } : null
  }

  function handleDragStart(e: DragStartEvent) {
    const card = cards.find(c => c.id === String(e.active.id))
    setActiveCard(card ?? null)
    if (card) setDragOrigin({ board: card.board, column_id: card.column_id, position: card.position })
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
    const activeId = String(active.id)
    setActiveCard(null)

    if (!over) {
      if (dragOrigin) setCards(prev => prev.map(c => c.id === activeId ? { ...c, ...dragOrigin } : c))
      setDragOrigin(null)
      return
    }

    const dest = resolveCol(String(over.id))
    if (!dest) {
      if (dragOrigin) setCards(prev => prev.map(c => c.id === activeId ? { ...c, ...dragOrigin } : c))
      setDragOrigin(null)
      return
    }

    const siblings = cards.filter(c => c.board === dest.board && c.column_id === dest.column_id && c.id !== activeId)
    const overCard = cards.find(c => c.id === String(over.id))
    const newPos   = overCard && overCard.id !== activeId ? overCard.position : siblings.length

    setCards(prev => prev.map(c =>
      c.id === activeId ? { ...c, board: dest.board, column_id: dest.column_id, position: newPos } : c
    ))
    setDragOrigin(null)

    await supabase.from('dynamics_cards')
      .update({ board: dest.board, column_id: dest.column_id, position: newPos })
      .eq('id', activeId)
  }

  function handleBoardChange(board: 'board1' | 'board2') {
    setTargetBoard(board)
    const firstCat = categories[0]?.slug || ''
    setColId(board === 'board1' ? firstCat : BOARD2_COLS[0].id)
    setCat(firstCat)
  }

  function openEdit(card: DynamicsCard) {
    setEditingCard(card)
    setTitle(card.title)
    setDesc(card.description || '')
    setTargetBoard(card.board)
    setColId(card.column_id)
    setCat(card.category || categories[0]?.slug || '')
    setFile(null)
    setModal(true)
    setDetailCard(null)
  }

  function closeModal() {
    setModal(false)
    setEditingCard(null)
    setTitle(''); setDesc(''); setCat(categories[0]?.slug || ''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Upload de novo anexo (se houver)
    let attachment_url = editingCard?.attachment_url ?? null
    let attachment_name = editingCard?.attachment_name ?? null
    let attachment_type = editingCard?.attachment_type ?? null

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

    const categoryValue = targetBoard === 'board1' ? colId : category

    if (editingCard) {
      // EDIT
      await supabase.from('dynamics_cards').update({
        board: targetBoard,
        column_id: colId,
        title,
        description,
        category: categoryValue,
        attachment_url, attachment_name, attachment_type,
      }).eq('id', editingCard.id)
    } else {
      // CREATE
      const pos = cards.filter(c => c.board === targetBoard && c.column_id === colId).length
      await supabase.from('dynamics_cards').insert({
        board: targetBoard, column_id: colId, title, description,
        category: categoryValue,
        project_id: activeProject?.id ?? profile?.project_id,
        attachment_url, attachment_name, attachment_type, position: pos, created_by: profile?.id,
      })
    }

    closeModal()
    setSaving(false)
    load()
  }

  async function removeAttachment() {
    if (!editingCard) return
    if (!window.confirm('Remover o anexo atual?')) return
    await supabase.from('dynamics_cards').update({
      attachment_url: null, attachment_name: null, attachment_type: null,
    }).eq('id', editingCard.id)
    setEditingCard({ ...editingCard, attachment_url: null, attachment_name: null, attachment_type: null })
    load()
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
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Arraste dinâmicas para agendar na semana — e de volta para desagendar</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Nova dinâmica</button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        autoScroll={{ threshold: { x: 0.1, y: 0.15 }, acceleration: 20, interval: 5 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >

        {/* Board 1 — Estratégias */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>Estratégias</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>Organize suas dinâmicas por setor</div>
            </div>
            <button onClick={() => setCategoryModal({ open: true })} style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}>+ Novo setor</button>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
              {categories.map(cat => (
                <Column key={cat.id} colId={cat.slug} label={cat.name} color={cat.color}
                  cards={colCards('board1', cat.slug)} onDetail={setDetailCard} onAttachment={setAttachCard} onDelete={handleDelete}
                  canManage={(c) => profile?.role === 'admin' || c.created_by === profile?.id}
                  categories={categories}
                  onEditCategory={() => setCategoryModal({ open: true, editing: cat })}
                  onDeleteCategory={() => handleDeleteCategory(cat)} />
              ))}
              {categories.length === 0 && (
                <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', width: '100%' }}>
                  Nenhum setor cadastrado. Clique em "+ Novo setor" para criar.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bidirectional indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>↑</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.02em' }}>arraste para agendar ou desagendar</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>↓</span>
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
                  cards={colCards('board2', col.id)} onDetail={setDetailCard} onAttachment={setAttachCard} onDelete={handleDelete}
                  compact categories={categories}
                  canManage={(c) => profile?.role === 'admin' || c.created_by === profile?.id} />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeCard ? <FloatingCard card={activeCard} categories={categories} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail drawer */}
      <Drawer open={!!detailCard} onClose={() => setDetailCard(null)} title="Detalhes">
        {detailCard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {detailCard.category && (
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Setor</div>
                <CategoryBadge categoryKey={detailCard.category} categories={categories} />
              </div>
            )}
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Título</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#FFF' }}>{detailCard.title}</div>
            </div>
            {detailCard.description && (
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Descrição</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{detailCard.description}</div>
              </div>
            )}
            {detailCard.attachment_url && (
              <div>
                <div className="label" style={{ marginBottom: 10 }}>Anexo</div>
                <FileViewer url={detailCard.attachment_url} fileType={detailCard.attachment_type ?? ''} name={detailCard.attachment_name ?? undefined} />
              </div>
            )}
            {(profile?.role === 'admin' || detailCard.created_by === profile?.id) && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { handleDelete(detailCard); setDetailCard(null) }} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,107,107,0.25)',
                  background: 'rgba(255,107,107,0.08)', color: '#ff6b6b',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Excluir</button>
                <button onClick={() => openEdit(detailCard)} className="btn-primary" style={{ fontSize: 12 }}>
                  ✎ Editar
                </button>
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
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>{editingCard ? 'Editar dinâmica' : 'Nova dinâmica'}</span>
              <button onClick={closeModal} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent',
                border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>Board</div>
                <select className="input" value={targetBoard} onChange={e => handleBoardChange(e.target.value as 'board1'|'board2')}>
                  <option value="board1">Estratégias</option>
                  <option value="board2">Planejamento Semanal</option>
                </select>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>Coluna</div>
                <select className="input" value={colId} onChange={e => setColId(e.target.value)}>
                  {targetBoard === 'board1'
                    ? categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)
                    : BOARD2_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                  }
                </select>
              </div>

              {/* Setor: automático em board1, escolhe em board2 */}
              {targetBoard === 'board1' ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <div className="label" style={{ margin: 0 }}>Setor</div>
                  <CategoryBadge categoryKey={colId} categories={categories} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>automático</span>
                </div>
              ) : (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Setor</div>
                  <select className="input" value={category} onChange={e => setCat(e.target.value)}>
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                  {category && (
                    <div style={{ marginTop: 6 }}>
                      <CategoryBadge categoryKey={category} categories={categories} />
                    </div>
                  )}
                </div>
              )}

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
                <div className="label" style={{ marginBottom: 6 }}>Anexo {editingCard?.attachment_name && '(substitui o atual)'}</div>
                {editingCard?.attachment_url && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📎 {editingCard.attachment_name}
                    </span>
                    <button type="button" onClick={removeAttachment} style={{
                      fontSize: 11, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer',
                    }}>Remover</button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="input" style={{ paddingTop: 6 }} />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Salvando...' : (editingCard ? 'Salvar alterações' : 'Criar card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de categoria/setor */}
      {categoryModal.open && (
        <CategoryFormModal
          existing={categoryModal.editing ?? null}
          projectId={activeProject?.id ?? ''}
          existingSlugs={categories.map(c => c.slug)}
          onClose={() => setCategoryModal({ open: false })}
          onSaved={() => { setCategoryModal({ open: false }); load() }}
        />
      )}
    </div>
  )
}

/* ─── Modal de criar/editar setor ─────────────────────── */
function CategoryFormModal({ existing, projectId, existingSlugs, onClose, onSaved }: {
  existing: DynamicsCategory | null
  projectId: string
  existingSlugs: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(existing?.name || '')
  const [color, setColor] = useState(existing?.color || PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function slugify(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Digite um nome.'); return }

    setSaving(true)
    if (existing) {
      // editar
      await supabase.from('dynamics_categories')
        .update({ name: name.trim(), color })
        .eq('id', existing.id)
    } else {
      // criar
      const slug = slugify(name)
      if (existingSlugs.includes(slug)) {
        setError('Já existe um setor com esse nome.')
        setSaving(false); return
      }
      const pos = existingSlugs.length
      const { error: err } = await supabase.from('dynamics_categories').insert({
        project_id: projectId, slug, name: name.trim(), color, position: pos,
      })
      if (err) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    }
    onSaved()
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-raised" style={{ width: '100%', maxWidth: 400, margin: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#FFF' }}>
            {existing ? 'Editar setor' : 'Novo setor'}
          </span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent',
            border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Nome do setor</div>
            <input required className="input" autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Reativação, Black Friday..." />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>Cor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: '100%', height: 36, borderRadius: 8, border: c === color ? '2px solid #FFF' : '2px solid transparent',
                  background: c, cursor: 'pointer', transition: 'transform 0.12s',
                  boxShadow: c === color ? `0 0 12px ${c}80` : 'none',
                }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '10px 12px' }}>
            <div className="label" style={{ margin: 0 }}>Preview</div>
            <div style={{
              display: 'inline-block', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              color: '#FFF', background: color, borderRadius: 5, padding: '2px 7px',
            }}>{name || 'sem nome'}</div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)',
              border: '1px solid rgba(255,107,107,0.2)', padding: '8px 12px', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : (existing ? 'Salvar' : 'Criar setor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
