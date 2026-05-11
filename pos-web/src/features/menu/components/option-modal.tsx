import { useMemo, useReducer, useState } from 'react'
import type { MenuOptionGroupRecord, MenuOptionRecord, MenuProductRecord } from '../../../db/schemas/menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { formatVnd } from '../../../shared/lib/format-vnd'
import type { CartItemInput } from '../../orders/types'
import { useOptionGroupsForProduct } from '../hooks'
import { OptionChip } from './option-chip'

type OptionGroupWithOptions = { group: MenuOptionGroupRecord; options: MenuOptionRecord[] }
type OptionModalProps = { product: MenuProductRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onAddToCart: (item: CartItemInput) => void }

function initialSelections(groups: OptionGroupWithOptions[]): Record<string, string[]> {
  return Object.fromEntries(groups.map(({ group, options }) => [group.id, options.filter((option) => option.isDefault).slice(0, Math.max(1, group.maxSelect)).map((option) => option.id)]))
}

function minimumRequiredSelections(group: MenuOptionGroupRecord): number {
  return Math.max(group.isRequired ? 1 : 0, group.minSelect)
}

function missingGroup(groups: OptionGroupWithOptions[], selections: Record<string, string[]>): MenuOptionGroupRecord | undefined {
  return groups.find(({ group, options }) => {
    const minimum = minimumRequiredSelections(group)
    if (minimum <= 0) return false
    if (options.length < minimum) return true
    return (selections[group.id]?.length ?? 0) < minimum
  })?.group
}

export function OptionModal({ product, open, onOpenChange, onAddToCart }: OptionModalProps) {
  const groups = useOptionGroupsForProduct(open ? product : null)
  const [overrides, setOverrides] = useState<Record<string, string[]> | null>(null)
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState('')
  const [resetKey, resetDraft] = useReducer((value: number) => value + 1, 0)
  const defaultSelections = useMemo(() => initialSelections(groups ?? []), [groups])
  const selections = useMemo(() => overrides ?? defaultSelections, [overrides, defaultSelections])
  const selectedOptions = useMemo(() => {
    if (!groups) return []
    const selected = new Set(Object.values(selections).flat())
    return groups.flatMap(({ options }) => options.filter((option) => selected.has(option.id)))
  }, [groups, selections])

  const previewPrice = (product?.priceVnd ?? 0) + selectedOptions.reduce((sum, option) => sum + option.priceDeltaVnd, 0)
  const firstMissingGroup = groups ? missingGroup(groups, selections) : undefined
  const canAdd = Boolean(product && groups && groups.length > 0 && !firstMissingGroup)

  function updateOpen(openValue: boolean) {
    if (!openValue) { setOverrides(null); setNote(''); setFeedback(''); resetDraft() }
    onOpenChange(openValue)
  }

  function updateSelections(updater: (current: Record<string, string[]>) => Record<string, string[]>) {
    setOverrides((current) => updater(current ?? selections))
  }

  function toggleOption(group: MenuOptionGroupRecord, option: MenuOptionRecord) {
    const currentIds = selections[group.id] ?? []
    const isSelected = currentIds.includes(option.id)
    setFeedback('')
    if (group.maxSelect === 1) { updateSelections((current) => ({ ...current, [group.id]: [option.id] })); return }
    if (isSelected) {
      const minimum = Math.max(group.isRequired ? 1 : 0, group.minSelect)
      if (currentIds.length <= minimum) return
      updateSelections((current) => ({ ...current, [group.id]: currentIds.filter((id) => id !== option.id) }))
      return
    }
    if (currentIds.length >= group.maxSelect) { setFeedback(`Tối đa ${group.maxSelect} ${group.name.toLocaleLowerCase('vi')}`); return }
    updateSelections((current) => ({ ...current, [group.id]: [...currentIds, option.id] }))
  }

  function handleAdd() {
    if (!product || !groups || !canAdd) return
    const selected = new Set(Object.values(selections).flat())
    const options = groups.flatMap(({ options }) => options.filter((option) => selected.has(option.id)))
    const input: CartItemInput = {
      productId: product.id,
      productNameSnapshot: product.name,
      unitPriceSnapshot: product.priceVnd,
      options: options.map((option) => ({ optionId: option.id, labelSnapshot: option.label, priceDeltaSnapshot: option.priceDeltaVnd })),
      quantity: 1,
      lineTotal: product.priceVnd + options.reduce((sum, option) => sum + option.priceDeltaVnd, 0),
    }
    const trimmedNote = note.trim()
    if (trimmedNote) input.note = trimmedNote
    onAddToCart(input)
    updateOpen(false)
  }

  return (
    <Dialog key={`${product?.id ?? 'none'}-${resetKey}`} open={open} onOpenChange={updateOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto" aria-describedby="option-modal-description">
        <DialogHeader><DialogTitle>{product ? `Tùy chọn: ${product.name}` : 'Tùy chọn sản phẩm'}</DialogTitle><DialogDescription id="option-modal-description">Giá hiện tại: <strong>{formatVnd(previewPrice)}</strong></DialogDescription></DialogHeader>
        {!groups ? <div role="status" className="rounded-lg border border-border bg-surface-muted p-4 text-sm">Đang tải tùy chọn...</div> : null}
        {groups?.map(({ group, options }) => {
          const selectedIds = selections[group.id] ?? []
          const isMissing = firstMissingGroup?.id === group.id
          const chipRole = group.isRequired && group.maxSelect === 1 ? 'radio' : 'checkbox'
          return <section key={group.id} role="group" aria-label={group.name} className={`mt-4 rounded-lg border p-3 ${isMissing ? 'border-danger' : 'border-border'}`}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{group.name}</h3>{group.isRequired || group.minSelect > 0 ? <span className="rounded-full border border-danger/40 px-2 py-1 text-xs font-medium text-danger">Bắt buộc</span> : null}</div>{isMissing ? <p className="mt-1 text-sm font-medium text-danger">Chọn {group.name} để tiếp tục</p> : null}{options.length === 0 ? <p className="mt-2 text-sm text-text-secondary">Tùy chọn chưa sẵn sàng.</p> : null}<div className="mt-3 grid grid-cols-2 gap-2">{options.map((option) => <OptionChip key={option.id} label={option.label} priceDeltaVnd={option.priceDeltaVnd} selected={selectedIds.includes(option.id)} role={chipRole} maxReached={!selectedIds.includes(option.id) && group.maxSelect > 1 && selectedIds.length >= group.maxSelect} onToggle={() => toggleOption(group, option)} />)}</div></section>
        })}
        {feedback ? <p role="status" aria-live="polite" className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm">{feedback}</p> : null}
        {firstMissingGroup ? <p className="mt-3 text-sm text-danger">Chọn {firstMissingGroup.name} để tiếp tục</p> : null}
        <label className="mt-4 block text-sm font-medium" htmlFor="cart-item-note">Ghi chú</label>
        <textarea id="cart-item-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Ghi chú (tùy chọn)" className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2" />
        <button type="button" disabled={!canAdd} onClick={handleAdd} className="mt-4 min-h-12 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">Thêm vào giỏ · {formatVnd(previewPrice)}</button>
      </DialogContent>
    </Dialog>
  )
}
