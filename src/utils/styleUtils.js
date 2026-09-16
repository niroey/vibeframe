const PX_KEYS = new Set([
  'width',
  'height',
  'fontSize',
  'borderRadius',
  'padding',
  'margin',
  'gap',
  'top',
  'left',
  'right',
  'bottom'
  ,'borderWidth'
])

/** { width: 200, color: '#fff' } -> { width: '200px', color: '#fff' } */
export function toCssStyle(style = {}) {
  const out = {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = typeof value === 'number' && PX_KEYS.has(key) ? `${value}px` : value
  }
  return out
}
