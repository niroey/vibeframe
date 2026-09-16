/**
 * 아주 단순한 Undo/Redo 히스토리 매니저.
 * 스펙 문서 14번: "AI가 변경한 것도 하나의 History로 취급"
 * 한 항목 = 특정 시점의 전체 documentJson(pages) 스냅샷 + 설명(label)
 */
export function createHistoryManager(initialState, limit = 50) {
  let past = []
  let future = []
  let present = clone(initialState)

  function clone(v) {
    return JSON.parse(JSON.stringify(v))
  }

  return {
    get present() {
      return present
    },
    get canUndo() {
      return past.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
    get log() {
      return past.map((p) => p.label).concat([])
    },
    reset(nextState) {
      past = []
      future = []
      present = clone(nextState)
    },
    /** 새 상태를 확정하고 히스토리에 기록 */
    commit(nextState, label = '변경') {
      past.push({ state: present, label })
      if (past.length > limit) past.shift()
      present = clone(nextState)
      future = []
    },
    undo() {
      if (!past.length) return present
      future.unshift({ state: present, label: '(redo)' })
      const last = past.pop()
      present = last.state
      return present
    },
    redo() {
      if (!future.length) return present
      past.push({ state: present, label: '(undo)' })
      const next = future.shift()
      present = next.state
      return present
    }
  }
}
