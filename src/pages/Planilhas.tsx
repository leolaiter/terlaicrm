import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Sheet {
  id: string
  user_id: string
  name: string
  created_at: string
}

interface SheetColumn {
  id: string
  sheet_id: string
  name: string
  type: 'text' | 'number' | 'date' | 'email'
  position: number
}

interface SheetRow {
  id: string
  sheet_id: string
  data: Record<string, string>
  position: number
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto', number: 'Número', date: 'Data', email: 'E-mail',
}

// ── Cell editor ──────────────────────────────────────────────────────────────
function Cell({
  value, type, onChange, onBlur,
}: {
  value: string
  type: SheetColumn['type']
  onChange: (v: string) => void
  onBlur: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <input
      ref={ref}
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
      style={{
        width: '100%', padding: '5px 8px',
        background: 'rgba(255,255,255,0.09)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: 6, color: '#FFF',
        fontSize: 12.5, fontFamily: 'Inter',
        outline: 'none',
      }}
    />
  )
}

// ── Column header ─────────────────────────────────────────────────────────────
function ColHeader({
  col, onRename, onDelete,
}: {
  col: SheetColumn
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(col.name)

  function commit() {
    const trimmed = draft.trim() || col.name
    setDraft(trimmed)
    setEditing(false)
    if (trimmed !== col.name) onRename(col.id, trimmed)
  }

  return (
    <th style={{
      padding: '0 8px', height: 38, textAlign: 'left', position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.04)',
      minWidth: 140, maxWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit() }}
            style={{
              flex: 1, padding: '3px 6px', background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.22)', borderRadius: 5,
              color: '#FFF', fontSize: 11, fontFamily: 'Inter', outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              flex: 1, textAlign: 'left', background: 'none', border: 'none',
              cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
              fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'Inter', padding: 0,
            }}
            title={`Tipo: ${TYPE_LABELS[col.type]}`}
          >
            {col.name}
          </button>
        )}
        <button
          onClick={() => onDelete(col.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.18)', fontSize: 13, lineHeight: 1,
            padding: '0 2px', fontFamily: 'Inter',
          }}
          title="Remover coluna"
        >
          ×
        </button>
      </div>
    </th>
  )
}

// ── Editable sheet ────────────────────────────────────────────────────────────
function EditableSheet({ sheetId }: { sheetId: string }) {
  const [columns, setColumns] = useState<SheetColumn[]>([])
  const [rows, setRows]       = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null)
  const [draftValue, setDraftValue] = useState('')
  useAuth()

  const load = useCallback(async () => {
    const [{ data: cols }, { data: rws }] = await Promise.all([
      supabase.from('sheet_columns').select('*').eq('sheet_id', sheetId).order('position'),
      supabase.from('sheet_rows').select('*').eq('sheet_id', sheetId).order('position'),
    ])
    setColumns((cols as SheetColumn[]) ?? [])
    setRows((rws as SheetRow[]) ?? [])
    setLoading(false)
  }, [sheetId])

  useEffect(() => { load() }, [load])

  async function addColumn() {
    const pos = columns.length
    const { data } = await supabase
      .from('sheet_columns')
      .insert({ sheet_id: sheetId, name: `Coluna ${pos + 1}`, type: 'text', position: pos })
      .select().single()
    if (data) setColumns(prev => [...prev, data as SheetColumn])
  }

  async function renameColumn(id: string, name: string) {
    await supabase.from('sheet_columns').update({ name }).eq('id', id)
    setColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }

  async function deleteColumn(id: string) {
    await supabase.from('sheet_columns').delete().eq('id', id)
    setColumns(prev => prev.filter(c => c.id !== id))
  }

  async function addRow() {
    const pos = rows.length
    const { data } = await supabase
      .from('sheet_rows')
      .insert({ sheet_id: sheetId, data: {}, position: pos })
      .select().single()
    if (data) setRows(prev => [...prev, data as SheetRow])
  }

  async function deleteRow(id: string) {
    await supabase.from('sheet_rows').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function startEdit(rowId: string, colId: string, currentValue: string) {
    setEditingCell({ rowId, colId })
    setDraftValue(currentValue)
  }

  async function commitEdit() {
    if (!editingCell) return
    const { rowId, colId } = editingCell
    const row = rows.find(r => r.id === rowId)
    if (!row) { setEditingCell(null); return }
    const newData = { ...row.data, [colId]: draftValue }
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r))
    await supabase.from('sheet_rows').update({ data: newData }).eq('id', rowId)
    setEditingCell(null)
  }

  // New-row draft — triggers a real row insert when user types something
  const [newRowDraft, setNewRowDraft] = useState<Record<string, string>>({})
  const [newRowActive, setNewRowActive] = useState(false)

  async function commitNewRowCell(colId: string, value: string) {
    const draft = { ...newRowDraft, [colId]: value }
    const hasContent = Object.values(draft).some(v => v.trim())
    if (!hasContent) { setNewRowDraft({}); setNewRowActive(false); return }
    const pos = rows.length
    const { data } = await supabase
      .from('sheet_rows')
      .insert({ sheet_id: sheetId, data: draft, position: pos })
      .select().single()
    if (data) setRows(prev => [...prev, data as SheetRow])
    setNewRowDraft({})
    setNewRowActive(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.12)', borderTopColor: '#D4C429' }}
        className="animate-spin" />
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 400 }}>
        <thead>
          <tr>
            {/* row number header */}
            <th style={{
              width: 40, minWidth: 40, padding: '0 8px', height: 38,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.20)', fontSize: 10,
            }} />
            {columns.map(col => (
              <ColHeader key={col.id} col={col} onRename={renameColumn} onDelete={deleteColumn} />
            ))}
            <th style={{
              width: 44, padding: '0 8px', height: 38,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <button
                onClick={addColumn}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 6, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                  fontSize: 15, width: 26, height: 26, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter',
                }}
                title="Adicionar coluna"
              >
                +
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              className="sheet-row"
            >
              {/* row number */}
              <td style={{
                width: 40, textAlign: 'center', padding: '0 6px', height: 36,
                borderRight: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.20)', fontSize: 11,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span>{idx + 1}</span>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="row-delete-btn"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)', fontSize: 12, padding: '0 1px',
                      display: 'none', fontFamily: 'Inter',
                    }}
                    title="Excluir linha"
                  >
                    ×
                  </button>
                </div>
              </td>
              {columns.map(col => {
                const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id
                const val = row.data[col.id] ?? ''
                return (
                  <td
                    key={col.id}
                    style={{
                      padding: '0 8px', height: 36,
                      borderRight: '1px solid rgba(255,255,255,0.04)',
                      fontSize: 12.5, color: val ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.20)',
                      cursor: 'text', minWidth: 140, maxWidth: 200,
                    }}
                    onClick={() => !isEditing && startEdit(row.id, col.id, val)}
                  >
                    {isEditing ? (
                      <Cell
                        value={draftValue}
                        type={col.type}
                        onChange={setDraftValue}
                        onBlur={commitEdit}
                      />
                    ) : (
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {val || '—'}
                      </span>
                    )}
                  </td>
                )
              })}
              <td style={{ width: 44 }} />
            </tr>
          ))}

          {/* New row */}
          {columns.length > 0 && (
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{
                width: 40, textAlign: 'center', padding: '0 6px', height: 36,
                borderRight: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.18)', fontSize: 11,
                background: 'rgba(255,255,255,0.01)',
              }}>
                {rows.length + 1}
              </td>
              {columns.map(col => (
                <td
                  key={col.id}
                  style={{
                    padding: '0 8px', height: 36,
                    borderRight: '1px solid rgba(255,255,255,0.04)',
                    fontSize: 12.5, cursor: 'text', minWidth: 140,
                  }}
                  onClick={() => setNewRowActive(true)}
                >
                  {newRowActive ? (
                    <Cell
                      value={newRowDraft[col.id] ?? ''}
                      type={col.type}
                      onChange={v => setNewRowDraft(prev => ({ ...prev, [col.id]: v }))}
                      onBlur={() => commitNewRowCell(col.id, newRowDraft[col.id] ?? '')}
                    />
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>
                      {col.position === 0 ? 'Nova linha…' : ''}
                    </span>
                  )}
                </td>
              ))}
              <td style={{ width: 44 }} />
            </tr>
          )}
        </tbody>
      </table>

      {columns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
          Adicione uma coluna para começar →
        </div>
      )}

      {columns.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
          <button
            onClick={addRow}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: 'Inter',
              padding: '4px 8px', borderRadius: 6, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.70)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)' }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            Adicionar linha
          </button>

          <button
            onClick={addColumn}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: 'Inter',
              padding: '4px 8px', borderRadius: 6, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.70)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)' }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            Adicionar coluna
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Planilhas() {
  const { profile } = useAuth()
  const [sheets, setSheets]             = useState<Sheet[]>([])
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [creatingSheet, setCreatingSheet] = useState(false)
  const [renamingId, setRenamingId]     = useState<string | null>(null)
  const [renameDraft, setRenameDraft]   = useState('')
  const seeded = useRef(false)

  async function loadSheets() {
    const { data } = await supabase
      .from('sheets')
      .select('*')
      .order('created_at')
    const list = (data as Sheet[]) ?? []
    setSheets(list)
    if (list.length > 0 && !activeId) setActiveId(list[0].id)
    setLoading(false)
    return list
  }

  async function seedLeadsSheet() {
    if (seeded.current || !profile) return
    seeded.current = true
    const list = await loadSheets()
    if (list.length > 0) return

    const { data: sheet } = await supabase
      .from('sheets')
      .insert({ user_id: profile.id, name: 'Leads' })
      .select().single()
    if (!sheet) return

    const colDefs = [
      { name: 'Nome',              type: 'text',   position: 0 },
      { name: 'E-mail',            type: 'email',  position: 1 },
      { name: 'Valor do Depósito', type: 'number', position: 2 },
      { name: 'Data',              type: 'date',   position: 3 },
    ]
    await supabase.from('sheet_columns').insert(
      colDefs.map(c => ({ ...c, sheet_id: sheet.id }))
    )
    setSheets([sheet as Sheet])
    setActiveId((sheet as Sheet).id)
  }

  useEffect(() => { if (profile) seedLeadsSheet() }, [profile])

  async function createSheet() {
    if (!profile) return
    setCreatingSheet(true)
    const { data } = await supabase
      .from('sheets')
      .insert({ user_id: profile.id, name: 'Nova Planilha' })
      .select().single()
    if (data) {
      setSheets(prev => [...prev, data as Sheet])
      setActiveId((data as Sheet).id)
      setRenamingId((data as Sheet).id)
      setRenameDraft('Nova Planilha')
    }
    setCreatingSheet(false)
  }

  async function renameSheet(id: string, name: string) {
    const trimmed = name.trim() || 'Planilha'
    await supabase.from('sheets').update({ name: trimmed }).eq('id', id)
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s))
    setRenamingId(null)
  }

  async function deleteSheet(id: string) {
    if (!window.confirm('Excluir esta planilha e todos os seus dados?')) return
    await supabase.from('sheets').delete().eq('id', id)
    const remaining = sheets.filter(s => s.id !== id)
    setSheets(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id ?? null)
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400 }}>
      <div className="page-header">
        <h1 className="page-title">Planilhas</h1>
        <p className="page-subtitle">Organize dados em tabelas editáveis</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#D4C429' }}
            className="animate-spin" />
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '10px 16px 0',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            overflowX: 'auto',
          }}>
            {sheets.map(sheet => (
              <div
                key={sheet.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px',
                  borderRadius: '8px 8px 0 0',
                  background: activeId === sheet.id
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                  borderBottom: activeId === sheet.id
                    ? '2px solid rgba(255,255,255,0.30)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  flexShrink: 0,
                }}
                onClick={() => setActiveId(sheet.id)}
              >
                {renamingId === sheet.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onBlur={() => renameSheet(sheet.id, renameDraft)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameSheet(sheet.id, renameDraft)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'rgba(255,255,255,0.09)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      borderRadius: 5, color: '#FFF', fontSize: 12.5,
                      fontFamily: 'Inter', padding: '2px 6px', outline: 'none', width: 110,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 12.5, fontWeight: activeId === sheet.id ? 600 : 400,
                      color: activeId === sheet.id ? '#FFF' : 'rgba(255,255,255,0.40)',
                      userSelect: 'none',
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation()
                      setRenamingId(sheet.id)
                      setRenameDraft(sheet.name)
                    }}
                  >
                    {sheet.name}
                  </span>
                )}
                {activeId === sheet.id && sheets.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteSheet(sheet.id) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.25)', fontSize: 14,
                      lineHeight: 1, padding: '0 2px', fontFamily: 'Inter',
                    }}
                    title="Excluir planilha"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={createSheet}
              disabled={creatingSheet}
              style={{
                flexShrink: 0, marginLeft: 4,
                background: 'none', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 7, color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer', fontSize: 16, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s', fontFamily: 'Inter',
              }}
              title="Nova planilha"
            >
              +
            </button>
          </div>

          {/* Sheet content */}
          <div style={{ padding: '0 0 16px' }}>
            {activeId ? (
              <EditableSheet key={activeId} sheetId={activeId} />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                Crie uma planilha para começar
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .sheet-row:hover .row-delete-btn { display: inline-flex !important; }
        .sheet-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  )
}
