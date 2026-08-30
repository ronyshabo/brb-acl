// Menu items are stored as an array on aclConfig/settings, which already has
// the rules a menu needs. Categories are fixed here so the tab always groups
// the same way.

export const MENU_CATEGORIES = [
  { id: 'espresso', label: 'Espresso' },
  { id: 'cold',     label: 'Cold drinks' },
  { id: 'noncoffee', label: 'Non-coffee' },
  { id: 'food',     label: 'Food & other' },
]

export const categoryLabel = (id) =>
  MENU_CATEGORIES.find((c) => c.id === id)?.label || 'Other'

export const emptyItem = () => ({
  name: '',
  price: '',
  category: 'espresso',
  description: '',
  pitch: '',
  notes: '',
  available: true,
})
