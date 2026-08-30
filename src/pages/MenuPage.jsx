import { useState, useEffect, useMemo } from 'react'
import { watchMenu, saveMenuItem, removeMenuItem } from '../firebase/data'
import { MENU_CATEGORIES, categoryLabel, emptyItem } from '../constants/menu'
import '../styles/menu.css'

/**
 * What volunteers sell, and how to describe it to a customer.
 *
 * Built for someone holding a phone in one hand during a rush: search first,
 * big names, and the line they'd actually say to a customer set apart from
 * the ingredient list.
 */
export default function MenuPage({ isAdmin }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)   // item object, or null
  const [busy, setBusy] = useState(false)

  useEffect(() => watchMenu(setItems, setError), [])

  const grouped = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    const matches = (i) =>
      !q ||
      [i.name, i.description, i.pitch, i.notes].some((f) => (f || '').toLowerCase().includes(q))

    return MENU_CATEGORIES.map((cat) => ({
      ...cat,
      items: items
        .filter((i) => i.category === cat.id && matches(i))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    })).filter((cat) => cat.items.length)
  }, [items, query])

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await saveMenuItem(editing)
      setEditing(null)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return
    await removeMenuItem(item.id)
  }

  if (error) {
    return (
      <div className="menupage">
        <div className="panel">
          <h3>Can’t load the menu</h3>
          <p>
            Firestore refused the read
            {error.code === 'permission-denied'
              ? ' — the aclMenu rules aren’t deployed yet.'
              : `: ${error.code || 'unknown error'}.`}
          </p>
        </div>
      </div>
    )
  }

  if (items === null) return <div className="boot">Loading menu…</div>

  return (
    <div className="menupage">
      <div className="menubar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu…"
          aria-label="Search the menu"
        />
        {isAdmin && (
          <button onClick={() => setEditing({ ...emptyItem() })}>Add item</button>
        )}
      </div>

      {editing && (
        <form className="panel itemform" onSubmit={save}>
          <h3>{editing.id ? 'Edit item' : 'New item'}</h3>

          <div className="row">
            <label>
              Name
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Iced Horchata Latte"
                required
              />
            </label>
            <label className="narrow">
              Price
              <input
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                placeholder="$8"
              />
            </label>
            <label className="narrow">
              Category
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            What’s in it
            <input
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Espresso, horchata, oat milk, cinnamon"
            />
          </label>

          <label>
            How to explain it to a customer
            <textarea
              rows={3}
              value={editing.pitch}
              onChange={(e) => setEditing({ ...editing, pitch: e.target.value })}
              placeholder="Like a cinnamon-rice-milk latte — sweet, creamy, not too strong. Our most popular drink."
            />
          </label>

          <label>
            Heads-up (allergens, caffeine, anything they might ask)
            <input
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              placeholder="Contains dairy unless swapped. Two shots."
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={editing.available !== false}
              onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
            />
            Available — uncheck when it sells out
          </label>

          <div className="formacts">
            <button type="submit" disabled={busy || !editing.name}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!grouped.length && (
        <div className="panel">
          <h3>{query ? 'Nothing matches' : 'No menu yet'}</h3>
          <p>
            {query
              ? 'Try a different word — search covers names, ingredients and the customer explanation.'
              : isAdmin
                ? 'Add the first item and it’ll show up here for every volunteer.'
                : 'The menu hasn’t been filled in yet. Check back before your shift.'}
          </p>
        </div>
      )}

      {grouped.map((cat) => (
        <section key={cat.id} className="menugroup">
          <h2>{cat.label}</h2>
          <div className="items">
            {cat.items.map((item) => (
              <article
                key={item.id}
                className={`item ${item.available === false ? 'soldout' : ''}`}
              >
                <header>
                  <h3>{item.name}</h3>
                  {item.price && <span className="price">{item.price}</span>}
                </header>

                {item.available === false && <p className="soldflag">Sold out</p>}
                {item.description && <p className="desc">{item.description}</p>}

                {item.pitch && (
                  <blockquote className="pitch">
                    <span className="pitchlabel">Say it like this</span>
                    {item.pitch}
                  </blockquote>
                )}

                {item.notes && <p className="notes">{item.notes}</p>}

                {isAdmin && (
                  <div className="itemacts">
                    <button onClick={() => setEditing({ ...item })}>Edit</button>
                    <button className="danger" onClick={() => remove(item)}>Remove</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
