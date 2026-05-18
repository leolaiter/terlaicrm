import { useEffect, useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DynamicsCard } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const BOARD1_COLS = [
  { id: 'alavancagem', label: 'Alavancagem de Capital' },
  { id: 'recuperacao', label: 'Recuperação de Capital' },
  { id: 'entrada', label: 'Entrada Assertiva' },
  { id: 'disparos', label: 'Disparos' },
]

const BOARD2_COLS = [
  { id: 'SEG', label: 'SEG' },
  { id: 'TER', label: 'TER' },
  { id: 'QUA', label: 'QUA' },
  { id: 'QUI', label: 'QUI' },
  { id: 'SEX', label: 'SEX' },
  { id: 'SAB', label: 'SAB' },
  { id: 'DOM', label: 'DOM' },
]

interface CardModalState {
  open: boolean
  card?: DynamicsCard | null
}

function SortableCard({
  card,
  onView,
  onViewAttachment,
}: {
  card: DynamicsCard
  onView: (c: DynamicsCard) => void
  onViewAttachment: (c: DynamicsCard) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-[#E5E5E5] rounded-lg p-3 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="text-sm font-medium text-[#1A1A1A] mb-1">{card.title}</div>
      {card.description && <div className="text-xs text-[#999] mb-2 line-clamp-2">{card.description}</div>}
      {card.category && (
        <div className="inline-block text-[10px] label-text px-2 py-0.5 bg-[#F2F2F0] rounded mb-2">{card.category}</div>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onView(card) }}
          className="text-[10px] text-[#999] hover:text-[#1A1A1A] transition-colors"
        >
          Detalhes
        </button>
        {card.attachment_url && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onViewAttachment(card) }}
            className="text-[10px] text-[#999] hover:text-[#1A1A1A] transition-colors"
          >
            📎 {card.attachment_name ?? 'Anexo'}
          </button>
        )}
      </div>
    </div>
  )
}

function Column({
  colId, label, cards, onView, onViewAttachment,
}: {
  colId: string
  label: string
  cards: DynamicsCard[]
  onView: (c: DynamicsCard) => void
  onViewAttachment: (c: DynamicsCard) => void
}) {
  return (
    <div className="flex flex-col min-w-[220px] max-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#1A1A1A]">{label}</span>
        <span className="text-[10px] text-[#AAAAAA] bg-[#F2F2F0] px-1.5 py-0.5 rounded">{cards.length}</span>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed border-[#E5E5E5]"
          data-column-id={colId}
        >
          {cards.map(card => (
            <SortableCard key={card.id} card={card} onView={onView} onViewAttachment={onViewAttachment} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function OverlayCard({ card }: { card: DynamicsCard }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 shadow-2xl opacity-90 w-[200px] rotate-2">
      <div className="text-sm font-medium text-[#1A1A1A]">{card.title}</div>
      {card.description && <div className="text-xs text-[#999] mt-1 line-clamp-2">{card.description}</div>}
    </div>
  )
}

export default function Dynamics() {
  const { profile } = useAuth()
  const [cards, setCards] = useState<DynamicsCard[]>([])
  const [activeCard, setActiveCard] = useState<DynamicsCard | null>(null)
  const [detailCard, setDetailCard] = useState<DynamicsCard | null>(null)
  const [attachCard, setAttachCard] = useState<DynamicsCard | null>(null)
  const [modal, setModal] = useState<CardModalState>({ open: false })
  const [activeBoard, setActiveBoard] = useState<'board1' | 'board2'>('board1')

  // new card form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [colId, setColId] = useState(BOARD1_COLS[0].id)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function loadCards() {
    const { data } = await supabase.from('dynamics_cards').select('*').order('position')
    setCards((data as DynamicsCard[]) ?? [])
  }

  useEffect(() => { loadCards() }, [])

  function getColCards(board: 'board1' | 'board2', col: string) {
    return cards.filter(c => c.board === board && c.column_id === col)
      .sort((a, b) => a.position - b.position)
  }

  function findCardById(id: string) { return cards.find(c => c.id === id) }

  function findColumnForCard(cardId: string): { board: 'board1' | 'board2'; column_id: string } | null {
    const card = findCardById(cardId)
    if (!card) return null
    return { board: card.board, column_id: card.column_id }
  }

  function getColumnFromDroppable(id: string): { board: 'board1' | 'board2'; column_id: string } | null {
    // id can be a colId like "alavancagem" or "SEG"
    if (BOARD1_COLS.find(c => c.id === id)) return { board: 'board1', column_id: id }
    if (BOARD2_COLS.find(c => c.id === id)) return { board: 'board2', column_id: id }
    // or it's a card id
    return findColumnForCard(id)
  }

  function handleDragStart(event: DragStartEvent) {
    const card = findCardById(String(event.active.id))
    setActiveCard(card ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over || active.id === over.id) return

    const activeInfo = findColumnForCard(String(active.id))
    const overInfo = getColumnFromDroppable(String(over.id))
    if (!activeInfo || !overInfo) return

    const { board: newBoard, column_id: newCol } = overInfo
    const colCards = cards.filter(c => c.board === newBoard && c.column_id === newCol).sort((a, b) => a.position - b.position)
    const overCard = findCardById(String(over.id))
    let newPosition = colCards.length

    if (overCard && overCard.column_id === newCol && overCard.board === newBoard) {
      newPosition = overCard.position
    }

    setCards(prev => prev.map(c =>
      c.id === String(active.id)
        ? { ...c, board: newBoard, column_id: newCol, position: newPosition }
        : c
    ))

    await supabase.from('dynamics_cards').update({ board: newBoard, column_id: newCol, position: newPosition })
      .eq('id', String(active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeInfo = findColumnForCard(String(active.id))
    const overInfo = getColumnFromDroppable(String(over.id))
    if (!activeInfo || !overInfo) return
    if (activeInfo.board === overInfo.board && activeInfo.column_id === overInfo.column_id) return

    setCards(prev => prev.map(c =>
      c.id === String(active.id)
        ? { ...c, board: overInfo.board, column_id: overInfo.column_id }
        : c
    ))
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let attachment_url = null, attachment_name = null, attachment_type = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${profile?.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('dynamics-attachments').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('dynamics-attachments').getPublicUrl(path)
        attachment_url = data.publicUrl
        attachment_name = file.name
        attachment_type = file.type
      }
    }

    const board = activeBoard
    const existingCount = cards.filter(c => c.board === board && c.column_id === colId).length

    await supabase.from('dynamics_cards').insert({
      board,
      column_id: colId,
      title,
      description,
      category,
      attachment_url,
      attachment_name,
      attachment_type,
      position: existingCount,
      created_by: profile?.id,
    })

    setTitle(''); setDescription(''); setCategory(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setModal({ open: false })
    setSaving(false)
    loadCards()
  }

  const board1Cols = BOARD1_COLS
  const board2Cols = BOARD2_COLS

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Dinâmicas</h1>
          <p className="text-sm text-[#999] mt-0.5">Organize estratégias em boards</p>
        </div>
        <button
          onClick={() => { setModal({ open: true }); setColId(activeBoard === 'board1' ? BOARD1_COLS[0].id : BOARD2_COLS[0].id) }}
          className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
        >
          + Nova dinâmica
        </button>
      </div>

      {/* Board tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[#F2F2F0] border border-[#E5E5E5] w-fit">
        {(['board1', 'board2'] as const).map(b => (
          <button
            key={b}
            onClick={() => setActiveBoard(b)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeBoard === b ? 'bg-[#1A1A1A] text-white' : 'text-[#AAAAAA] hover:text-[#1A1A1A]'
            }`}
          >
            {b === 'board1' ? 'Estratégias' : 'Planejamento Semanal'}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {(activeBoard === 'board1' ? board1Cols : board2Cols).map(col => (
              <Column
                key={col.id}
                colId={col.id}
                label={col.label}
                cards={getColCards(activeBoard, col.id)}
                onView={setDetailCard}
                onViewAttachment={setAttachCard}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCard ? <OverlayCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail Drawer */}
      <Drawer open={!!detailCard} onClose={() => setDetailCard(null)} title="Detalhes do Card">
        {detailCard && (
          <div className="space-y-4">
            <div>
              <div className="label-text mb-1">TÍTULO</div>
              <div className="text-base font-semibold text-[#1A1A1A]">{detailCard.title}</div>
            </div>
            {detailCard.description && (
              <div>
                <div className="label-text mb-1">DESCRIÇÃO</div>
                <div className="text-sm text-[#999]">{detailCard.description}</div>
              </div>
            )}
            {detailCard.category && (
              <div>
                <div className="label-text mb-1">CATEGORIA</div>
                <div className="text-sm text-[#1A1A1A]">{detailCard.category}</div>
              </div>
            )}
            {detailCard.attachment_url && (
              <div>
                <div className="label-text mb-3">ANEXO</div>
                <FileViewer url={detailCard.attachment_url} fileType={detailCard.attachment_type ?? ''} name={detailCard.attachment_name ?? undefined} />
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Attachment Drawer */}
      <Drawer open={!!attachCard} onClose={() => setAttachCard(null)} title={attachCard?.attachment_name ?? 'Anexo'} width="w-[560px]">
        {attachCard?.attachment_url && (
          <FileViewer url={attachCard.attachment_url} fileType={attachCard.attachment_type ?? ''} name={attachCard.attachment_name ?? undefined} />
        )}
      </Drawer>

      {/* New Card Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setModal({ open: false })} />
          <div className="relative glass-card p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-[#1A1A1A]">Nova dinâmica</span>
              <button onClick={() => setModal({ open: false })} className="text-[#999] hover:text-[#1A1A1A] text-xl">×</button>
            </div>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="label-text block mb-1.5">COLUNA</label>
                <select
                  value={colId}
                  onChange={e => setColId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A]"
                >
                  {(activeBoard === 'board1' ? BOARD1_COLS : BOARD2_COLS).map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text block mb-1.5">TÍTULO</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A]"
                  placeholder="Nome da dinâmica"
                />
              </div>
              <div>
                <label className="label-text block mb-1.5">DESCRIÇÃO</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A] resize-none"
                  placeholder="Descreva a dinâmica..."
                />
              </div>
              <div>
                <label className="label-text block mb-1.5">CATEGORIA</label>
                <input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm outline-none focus:border-[#1A1A1A]"
                  placeholder="ex: Meta, Reunião..."
                />
              </div>
              <div>
                <label className="label-text block mb-1.5">ANEXO (PDF ou IMAGEM)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#999] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1A1A1A] file:text-white cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal({ open: false })} className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-sm text-[#999] hover:text-[#1A1A1A] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Criar card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
