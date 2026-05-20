import { useState, useEffect, useRef, useCallback } from 'react'
import './EntityText.css'

// Global entity cache — loaded once, shared across all components
let entityCache = null
let entityCachePromise = null

async function loadEntities() {
  if (entityCache) return entityCache
  if (entityCachePromise) return entityCachePromise

  entityCachePromise = fetch('https://hqbot-backend.onrender.com/api/entities')
    .then(r => r.json())
    .then(data => {
      entityCache = data
      return data
    })
    .catch(() => [])

  return entityCachePromise
}

// Build a regex that matches any entity name or alias
function buildEntityMap(entities) {
  const map = {} // normalized name -> entity
  entities.forEach(e => {
    map[e.name] = e
    if (e.aliases) e.aliases.forEach(a => { map[a] = e })
  })
  return map
}

function buildRegex(entityMap) {
  const names = Object.keys(entityMap).sort((a, b) => b.length - a.length) // longest first
  if (names.length === 0) return null
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`(${escaped.join('|')})`, 'g')
}

// Split text into segments: plain text and entity matches
function segmentText(text, regex, entityMap) {
  if (!regex) return [{ type: 'text', content: text }]
  const segments = []
  let last = 0
  let match
  regex.lastIndex = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', content: text.slice(last, match.index) })
    }
    const entity = entityMap[match[0]]
    segments.push({ type: 'entity', content: match[0], entity })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    segments.push({ type: 'text', content: text.slice(last) })
  }
  return segments
}

function TooltipCard({ entity, position, onClose }) {
  const typeLabels = { person: 'شخصية', place: 'مكان', event: 'حدث', tribe: 'قبيلة' }
  const typeColors = { person: '#c9a84c', place: '#7ab5d4', event: '#c98a4c', tribe: '#a47bc9' }
  const color = typeColors[entity.type] || '#c9a84c'

  return (
    <div
      className="entity-tooltip"
      style={{ '--entity-color': color, ...position }}
      onClick={e => e.stopPropagation()}
    >
      <div className="entity-tooltip-header">
        <div className="entity-tooltip-type" style={{ color }}>{typeLabels[entity.type] || entity.type}</div>
        <button className="entity-tooltip-close" onClick={onClose}>✕</button>
      </div>
      <div className="entity-tooltip-name" dir="rtl">{entity.name}</div>
      {entity.dates && <div className="entity-tooltip-dates">{entity.dates}</div>}
      <p className="entity-tooltip-bio" dir="rtl">{entity.bio}</p>
    </div>
  )
}

function EntitySpan({ entity, children }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({})
  const spanRef = useRef(null)
  const tooltipRef = useRef(null)

  function openTooltip(e) {
    e.stopPropagation()
    const rect = spanRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const tooltipW = 260
    const tooltipH = 180

    let left = rect.left + rect.width / 2 - tooltipW / 2
    let top = rect.bottom + 8

    // Clamp horizontal
    left = Math.max(8, Math.min(left, viewportW - tooltipW - 8))
    // Flip above if not enough space below
    if (top + tooltipH > viewportH - 8) top = rect.top - tooltipH - 8

    setPos({ position: 'fixed', left, top, width: tooltipW })
    setOpen(true)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (!tooltipRef.current?.contains(e.target) && !spanRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  return (
    <>
      <span
        ref={spanRef}
        className="entity-highlight"
        onClick={openTooltip}
        onMouseEnter={openTooltip}
        onMouseLeave={e => {
          // Don't close if moving to tooltip
          const related = e.relatedTarget
          if (tooltipRef.current?.contains(related)) return
          setOpen(false)
        }}
      >
        {children}
      </span>
      {open && (
        <div ref={tooltipRef}
          onMouseLeave={() => setOpen(false)}
          style={{ position: 'fixed', zIndex: 9999, ...pos }}
        >
          <TooltipCard entity={entity} position={{}} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}

// Main component — wraps any text with entity detection
export function EntityText({ text, className }) {
  const [segments, setSegments] = useState([{ type: 'text', content: text }])

  useEffect(() => {
    loadEntities().then(entities => {
      if (!entities || entities.length === 0) return
      const map = buildEntityMap(entities)
      const regex = buildRegex(map)
      setSegments(segmentText(text, regex, map))
    })
  }, [text])

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'entity') {
          return <EntitySpan key={i} entity={seg.entity}>{seg.content}</EntitySpan>
        }
        return <span key={i}>{seg.content}</span>
      })}
    </span>
  )
}

// HOC — wraps ReactMarkdown children recursively
export function useEntityProcessor() {
  const [entityMap, setEntityMap] = useState(null)
  const [regex, setRegex] = useState(null)

  useEffect(() => {
    loadEntities().then(entities => {
      if (!entities || entities.length === 0) return
      const map = buildEntityMap(entities)
      setEntityMap(map)
      setRegex(buildRegex(map))
    })
  }, [])

  const processText = useCallback((text) => {
    if (!regex || !entityMap) return text
    const segs = segmentText(text, regex, entityMap)
    if (segs.length === 1 && segs[0].type === 'text') return text
    return segs.map((seg, i) => {
      if (seg.type === 'entity') return <EntitySpan key={i} entity={seg.entity}>{seg.content}</EntitySpan>
      return seg.content
    })
  }, [regex, entityMap])

  return processText
}