import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createNode, createPageFromTemplate } from '../utils/nodeFactory'
import { makeId } from '../utils/id'
import { createHistoryManager } from '../utils/history'
import { processAICommand } from '../utils/aiService'

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** 스펙 문서 4번 UI Tree 예시를 기반으로 한 초기 시드 데이터 */
function buildInitialDocument() {
  const home = {
    type: 'page',
    id: 'home',
    title: 'Home',
    children: [
      {
        ...createNode('container'),
        id: 'header',
        style: { display: 'flex', flexDirection: 'row', padding: 20, gap: 16, alignItems: 'center' },
        children: [
          { ...createNode('text'), id: 'logo', text: 'VibeFrame', style: { fontSize: 20, fontWeight: 800, color: '#1a1a1a' } }
        ]
      },
      {
        ...createNode('container'),
        id: 'hero',
        style: { display: 'flex', flexDirection: 'column', padding: 48, gap: 16, alignItems: 'flex-start' },
        children: [
          { ...createNode('text'), id: 'title', text: '아이디어를 멋진 화면으로', style: { fontSize: 32, fontWeight: 700, color: '#1a1a1a' } },
          { ...createNode('text'), id: 'subtitle', text: '드래그로 만들고 AI로 다듬어 보세요.', style: { fontSize: 16, color: '#5b6270' } },
          { ...createNode('button'), id: 'paymentButton', text: '시작하기', style: { width: 200, height: 48, borderRadius: 12, background: '#4f46e5', color: '#ffffff', fontSize: 15, fontWeight: 600 }, action: { type: 'navigate', target: 'dashboard' } }
        ]
      }
    ]
  }

  const login = createPageFromTemplate('login', 'login', 'Login')
  const dashboard = createPageFromTemplate('dashboard', 'dashboard', 'Dashboard')
  const payment = {
    type: 'page',
    id: 'payment',
    title: 'Payment',
    children: [
      { ...createNode('text'), text: '결제하기', style: { fontSize: 28, fontWeight: 700, color: '#1a1a1a' } },
      { ...createNode('input'), placeholder: '카드 번호' },
      { ...createNode('button'), text: '결제 완료', action: { type: 'navigate', target: 'dashboard' } }
    ]
  }

  return {
    pages: { home, login, dashboard, payment },
    order: ['home', 'login', 'dashboard', 'payment'],
    components: {}
  }
}

export const useProjectStore = defineStore('project', () => {
  const document = ref(buildInitialDocument())
  const user = ref(null)
  const currentPageId = ref('home')
  const selectedId = ref(null)
  const mode = ref('edit') // 'edit' | 'preview'
  const chatLog = ref([
    { role: 'ai', text: '안녕하세요! 예: "버튼 색깔 빨간색으로 바꿔", "로그인 페이지 만들어줘" 처럼 말해보세요.' }
  ])

  const history = createHistoryManager(document.value, 60)

  const pagesList = computed(() => document.value.order.map((id) => document.value.pages[id]))
  const currentPage = computed(() => document.value.pages[currentPageId.value])

  function commit(label) {
    history.commit(document.value, label)
    persist()
  }

  /** id로 노드를 재귀 탐색. 페이지 트리 어디에 있든 찾아서 실 참조를 반환 */
  function findNode(id) {
    for (const pageId of document.value.order) {
      const page = document.value.pages[pageId]
      if (page.id === id) return { node: page, list: null, index: -1, pageId }
      const found = searchChildren(page.children, id)
      if (found) return { ...found, pageId }
    }
    return null
  }

  function searchChildren(list, id) {
    if (!list) return null
    for (let i = 0; i < list.length; i++) {
      const child = list[i]
      if (child.id === id) return { node: child, list, index: i }
      if (child.children) {
        const found = searchChildren(child.children, id)
        if (found) return found
      }
    }
    return null
  }

  const selectedNode = computed(() => (selectedId.value ? findNode(selectedId.value)?.node ?? null : null))

  function select(id) {
    selectedId.value = id
  }

  function setMode(next) {
    mode.value = next
    if (next === 'preview') selectedId.value = null
  }

  function setCurrentPage(id) {
    if (!document.value.pages[id]) return
    currentPageId.value = id
    selectedId.value = null
  }

  /** 캔버스(또는 컨테이너)에 새 컴포넌트를 추가 */
  function addNode(type, containerId, index) {
    const node = createNode(type)
    const target = containerId ? findNode(containerId)?.node : currentPage.value
    if (!target || !target.children) {
      // 컨테이너가 아니면 현재 페이지 루트에 추가
      const list = currentPage.value.children
      list.splice(index == null ? list.length : index, 0, node)
    } else {
      const list = target.children
      list.splice(index == null ? list.length : index, 0, node)
    }
    selectedId.value = node.id
    commit(`${type} 추가`)
    return node.id
  }

  /** 같은 컨테이너/다른 컨테이너 모두 지원하는 트리 이동. */
  function moveNode(id, targetId, index, label = '요소 이동') {
    const source = findNode(id)
    const target = targetId ? findNode(targetId)?.node : currentPage.value
    if (!source?.list || !target?.children || id === targetId) return
    const sourceList = source.list
    const targetList = target.children
    const [node] = sourceList.splice(source.index, 1)
    let at = Number.isFinite(index) ? index : targetList.length
    if (sourceList === targetList && source.index < at) at--
    targetList.splice(Math.max(0, Math.min(at, targetList.length)), 0, node)
    selectedId.value = id
    commit(label)
  }

  function createComponent(id, name) {
    const found = findNode(id)
    if (!found?.node || found.node.type === 'page') return false
    const componentId = makeId('component')
    const definition = clone(found.node)
    definition.id = 'root'
    document.value.components ||= {}
    document.value.components[componentId] = {
      id: componentId,
      name: name || `My ${found.node.type}`,
      variants: { default: definition },
      defaultVariant: 'default'
    }
    found.list.splice(found.index, 1, { type: 'component', id: makeId('instance'), componentId, variant: 'default', style: {} })
    selectedId.value = null
    commit(`컴포넌트 생성: ${name || found.node.type}`)
    return componentId
  }

  function addComponentInstance(componentId, containerId, index) {
    if (!document.value.components?.[componentId]) return
    const target = containerId ? findNode(containerId)?.node : currentPage.value
    if (!target?.children) return
    const node = { type: 'component', id: makeId('instance'), componentId, variant: document.value.components[componentId].defaultVariant || 'default', style: {} }
    target.children.splice(index == null ? target.children.length : index, 0, node)
    selectedId.value = node.id
    commit('컴포넌트 인스턴스 추가')
  }

  function addVariant(componentId, name) {
    const component = document.value.components?.[componentId]
    if (!component) return
    const requested = name || `variant-${Object.keys(component.variants).length + 1}`
    const variantName = component.variants[requested] ? `${requested}-${Object.keys(component.variants).length + 1}` : requested
    component.variants[variantName] = clone(component.variants[component.defaultVariant || 'default'])
    commit(`Variant 추가: ${variantName}`)
  }

  function setComponentVariant(id, variant) {
    const node = findNode(id)?.node
    if (!node || node.type !== 'component') return
    node.variant = variant
    commit('컴포넌트 Variant 변경')
  }

  function deleteComponent(componentId) {
    if (!document.value.components?.[componentId]) return
    const removeInstances = (children = []) => children.filter((child) => {
      if (child.type === 'component' && child.componentId === componentId) return false
      if (child.children) child.children = removeInstances(child.children)
      return true
    })
    for (const page of Object.values(document.value.pages)) page.children = removeInstances(page.children)
    delete document.value.components[componentId]
    selectedId.value = null
    commit('재사용 컴포넌트 삭제')
  }

  function resolveComponent(node) {
    if (node?.type !== 'component') return node
    const component = document.value.components?.[node.componentId]
    const source = component?.variants?.[node.variant] || component?.variants?.[component?.defaultVariant]
    return source ? { ...clone(source), id: node.id, style: { ...source.style, ...node.style }, _componentInstance: node } : node
  }

  /** 속성 patch를 노드에 병합 (style은 얕은 병합) */
  function updateNode(id, patch, label = '속성 변경') {
    const found = findNode(id)
    if (!found) return
    const { node } = found
    if (patch.style) node.style = { ...node.style, ...patch.style }
    if (typeof patch.text === 'string') node.text = patch.text
    if (typeof patch.placeholder === 'string') node.placeholder = patch.placeholder
    if (typeof patch.src === 'string') node.src = patch.src
    if (typeof patch.icon === 'string') node.icon = patch.icon
    if (typeof patch.title === 'string' && node.type === 'page') node.title = patch.title
    commit(label)
  }

  function resizeNode(id, style, complete = false) {
    const node = findNode(id)?.node
    if (!node) return
    node.style = { ...node.style, ...style }
    if (complete) commit('마우스로 크기 조절')
  }

  /** 캔버스/컨테이너 안에서 자유 배치한 좌표를 기록합니다. */
  function positionNode(id, style, complete = false) {
    const node = findNode(id)?.node
    if (!node) return
    node.style = { ...node.style, position: 'absolute', ...style }
    if (complete) commit('요소 자유 이동')
  }

  function setAction(id, action, label = '액션 설정') {
    const found = findNode(id)
    if (!found) return
    found.node.action = action
    commit(label)
  }

  function deleteNode(id, label = '요소 삭제') {
    const found = findNode(id)
    if (!found || !found.list) return // 페이지 자체는 이 함수로 못 지움
    found.list.splice(found.index, 1)
    if (selectedId.value === id) selectedId.value = null
    commit(label)
  }

  function addPage(title, template = 'blank', label) {
    const id = makeId('page')
    const page = createPageFromTemplate(id, template, title)
    document.value.pages[id] = page
    document.value.order.push(id)
    currentPageId.value = id
    selectedId.value = null
    commit(label || `페이지 추가: ${title}`)
    return id
  }

  function undo() {
    if (!history.canUndo) return
    document.value = clone(history.undo())
    if (!document.value.pages[currentPageId.value]) currentPageId.value = document.value.order[0]
    selectedId.value = null
  }

  function redo() {
    if (!history.canRedo) return
    document.value = clone(history.redo())
    if (!document.value.pages[currentPageId.value]) currentPageId.value = document.value.order[0]
    selectedId.value = null
  }

  const canUndo = computed(() => history.canUndo)
  const canRedo = computed(() => history.canRedo)

  /** AI 채팅 명령 처리 (스펙 문서 6, 12, 13번) */
  async function runAICommand(prompt) {
    chatLog.value.push({ role: 'user', text: prompt })

    const context = {
      currentPage: currentPageId.value,
      pageList: document.value.order,
      selectedElement: selectedId.value,
      element: selectedNode.value ? clone(selectedNode.value) : null
    }

    const result = await processAICommand(prompt, context)

    switch (result.patch?.kind) {
      case 'style':
        if (selectedId.value) updateNode(selectedId.value, { style: result.patch.style }, `[AI] ${result.reply}`)
        break
      case 'text':
        if (selectedId.value) updateNode(selectedId.value, { text: result.patch.text }, `[AI] ${result.reply}`)
        break
      case 'resize': {
        if (selectedId.value && selectedNode.value?.style) {
          const s = selectedNode.value.style
          const w = Math.round((s.width || 120) * result.patch.factor)
          const h = Math.round((s.height || 40) * result.patch.factor)
          updateNode(selectedId.value, { style: { width: w, height: h } }, `[AI] ${result.reply}`)
        }
        break
      }
      case 'action':
        if (selectedId.value) setAction(selectedId.value, result.patch.action, `[AI] ${result.reply}`)
        break
      case 'createPage':
        addPage(result.patch.title, result.patch.template, `[AI] ${result.reply}`)
        break
      case 'delete':
        if (selectedId.value) deleteNode(selectedId.value, `[AI] ${result.reply}`)
        break
      default:
        break
    }

    chatLog.value.push({ role: 'ai', text: result.reply })
  }

  async function login(nickname) {
    const cleanNickname = String(nickname || '').trim()
    try {
      const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: cleanNickname }) })
      if (!response.ok) throw new Error('사용자 저장 API 오류')
      user.value = await response.json()
    } catch {
      // 서버 없이 GitHub에서 바로 실행해도 동일한 닉네임 작업 공간으로 진입합니다.
      user.value = { id: `offline-${encodeURIComponent(cleanNickname.toLowerCase())}`, nickname: cleanNickname, offline: true }
    }
    const storageKey = `vibeframe-document:${user.value.id}`
    const saved = localStorage.getItem(storageKey)
    document.value = buildInitialDocument()
    if (saved) {
      try { document.value = JSON.parse(saved) } catch { /* malformed old cache */ }
    }
    try {
      const projectResponse = await fetch(`/api/projects/default?userId=${encodeURIComponent(user.value.id)}`)
      if (projectResponse.ok) {
        const remote = await projectResponse.json()
        if (remote.document) document.value = remote.document
      }
    } catch { /* backend is optional during local development */ }
    document.value.components ||= {}
    // 이전 데모의 결제 전용 카피를 일반적인 시작 화면 카피로 한 번만 교체합니다.
    const legacyHero = document.value.pages?.home?.children?.find((item) => item.id === 'hero')
    if (legacyHero?.children?.find((item) => item.id === 'title')?.text === '결제 서비스') {
      const title = legacyHero.children.find((item) => item.id === 'title')
      const subtitle = legacyHero.children.find((item) => item.id === 'subtitle')
      const button = legacyHero.children.find((item) => item.id === 'paymentButton')
      title.text = '아이디어를 멋진 화면으로'
      subtitle.text = '드래그로 만들고 AI로 다듬어 보세요.'
      button.text = '시작하기'
      button.action = { type: 'navigate', target: 'dashboard' }
      persist()
    }
    history.reset(document.value)
  }

  async function init() {
    // 닉네임 화면에서 사용자를 선택한 뒤 프로젝트를 불러옵니다.
  }

  // API 저장 실패 시에도 새로고침으로 작업이 사라지지 않게 한다.
  let saveTimer
  function persist() {
    if (!user.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      localStorage.setItem(`vibeframe-document:${user.value.id}`, JSON.stringify(document.value))
      try { await fetch('/api/projects/default', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'My Project', userId: user.value.id, document: document.value }) }) } catch { /* offline fallback */ }
    }, 300)
  }

  return {
    document,
    user,
    currentPageId,
    currentPage,
    pagesList,
    selectedId,
    selectedNode,
    mode,
    chatLog,
    canUndo,
    canRedo,
    findNode,
    select,
    setMode,
    setCurrentPage,
    addNode,
    updateNode,
    resizeNode,
    positionNode,
    setAction,
    deleteNode,
    addPage,
    undo,
    redo,
    runAICommand,
    moveNode,
    createComponent,
    addComponentInstance,
    addVariant,
    setComponentVariant,
    deleteComponent,
    resolveComponent,
    persist,
    init,
    login
  }
})
