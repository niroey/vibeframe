let counter = 0

/**
 * 짧고 읽기 쉬운 id 생성기.
 * 예: text_a1b2c3
 */
export function makeId(prefix = 'node') {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}_${rand}${counter}`
}
