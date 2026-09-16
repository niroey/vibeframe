import { makeId } from './id'

// 컨테이너 계열(자식을 가질 수 있는 타입)
export const CONTAINER_TYPES = ['page', 'container', 'card', 'list']

// 왼쪽 ELEMENTS 팔레트에 노출되는 컴포넌트 목록 (문서 2, 10번 항목 기준)
export const PALETTE = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'button', label: 'Button', icon: '▭' },
  { type: 'image', label: 'Image', icon: '▨' },
  { type: 'input', label: 'Input', icon: '▯' },
  { type: 'container', label: 'Container', icon: '⬚' },
  { type: 'card', label: 'Card', icon: '▤' },
  { type: 'list', label: 'List', icon: '☰' },
  { type: 'icon', label: 'Icon', icon: '★' }
]

export const COMPONENT_TYPES = ['container', 'card', 'list']

/**
 * UI Tree 노드 하나를 생성합니다.
 * 스펙 문서의 JSON 구조를 그대로 따릅니다:
 * { type, id, text/src/..., style, children?, action? }
 */
export function createNode(type) {
  const id = makeId(type)

  switch (type) {
    case 'text':
      return {
        type: 'text',
        id,
        text: '텍스트',
        style: { fontSize: 16, fontWeight: 400, color: '#1a1a1a' }
      }

    case 'button':
      return {
        type: 'button',
        id,
        text: '버튼',
        style: {
          width: 140,
          height: 44,
          fontSize: 14,
          fontWeight: 600,
          color: '#ffffff',
          background: '#4f46e5',
          borderRadius: 10
        },
        action: { type: 'none', target: null }
      }

    case 'image':
      return {
        type: 'image',
        id,
        src: 'https://placehold.co/320x180/eef0f4/8a8f9c?text=Image',
        style: { width: 320, height: 180, borderRadius: 10 }
      }

    case 'input':
      return {
        type: 'input',
        id,
        placeholder: '입력하세요',
        style: { width: 260, height: 42, borderRadius: 8, fontSize: 14, color: '#1a1a1a', background: '#ffffff', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }
      }

    case 'container':
      return {
        type: 'container',
        id,
        children: [],
        style: {
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'transparent',
          borderRadius: 0
        }
      }

    case 'card':
      return {
        type: 'card',
        id,
        children: [],
        style: {
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: '#ffffff',
          borderRadius: 14
        }
      }

    case 'list':
      return {
        type: 'list',
        id,
        children: [],
        style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 0 }
      }

    case 'icon':
      return {
        type: 'icon',
        id,
        icon: '★',
        style: { fontSize: 22, color: '#4f46e5' }
      }

    case 'component':
      return { type: 'component', id, componentId: '', variant: 'default', style: {} }

    default:
      throw new Error(`알 수 없는 컴포넌트 타입: ${type}`)
  }
}

/** 새 빈 페이지 생성 */
export function createBlankPage(id, title = '새 페이지') {
  return {
    type: 'page',
    id,
    title,
    children: [
      {
        ...createNode('text'),
        text: title,
        style: { fontSize: 28, fontWeight: 700, color: '#1a1a1a' }
      }
    ]
  }
}

/** 템플릿: 로그인 페이지 (AI/새 페이지 모달에서 사용) */
export function createLoginPageTemplate(id) {
  const emailInput = { ...createNode('input'), placeholder: '이메일' }
  const pwInput = { ...createNode('input'), placeholder: '비밀번호' }
  const loginBtn = {
    ...createNode('button'),
    text: '로그인',
    style: { ...createNode('button').style, width: 260 },
    action: { type: 'navigate', target: 'dashboard' }
  }

  return {
    type: 'page',
    id,
    title: 'Login',
    children: [
      {
        ...createNode('card'),
        style: { ...createNode('card').style, width: 360, margin: '60px auto' },
        children: [
          { ...createNode('text'), text: '로그인', style: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' } },
          emailInput,
          pwInput,
          loginBtn
        ]
      }
    ]
  }
}

/** 템플릿: 대시보드 페이지 */
export function createDashboardPageTemplate(id) {
  return {
    type: 'page',
    id,
    title: 'Dashboard',
    children: [
      { ...createNode('text'), text: '대시보드', style: { fontSize: 28, fontWeight: 700, color: '#1a1a1a' } },
      {
        ...createNode('container'),
        style: { ...createNode('container').style, flexDirection: 'row', gap: 16 },
        children: [
          { ...createNode('card'), children: [{ ...createNode('text'), text: '오늘 매출' }] },
          { ...createNode('card'), children: [{ ...createNode('text'), text: '방문자 수' }] },
          { ...createNode('card'), children: [{ ...createNode('text'), text: '전환율' }] }
        ]
      }
    ]
  }
}

/** 템플릿: 랜딩 페이지 */
export function createLandingPageTemplate(id) {
  return {
    type: 'page',
    id,
    title: 'Landing',
    children: [
      {
        ...createNode('container'),
        style: { ...createNode('container').style, alignItems: 'center', padding: 48, gap: 16 },
        children: [
          { ...createNode('text'), text: '제품 이름', style: { fontSize: 36, fontWeight: 800, color: '#1a1a1a' } },
          { ...createNode('text'), text: '한 줄 설명을 입력하세요.', style: { fontSize: 16, color: '#5b6270' } },
          { ...createNode('button'), text: '시작하기' }
        ]
      }
    ]
  }
}

/** 템플릿: 이커머스 상품 목록 */
export function createEcommercePageTemplate(id) {
  const card = () => ({
    ...createNode('card'),
    style: { ...createNode('card').style, width: 220 },
    children: [
      { ...createNode('image'), style: { width: 180, height: 120, borderRadius: 8 } },
      { ...createNode('text'), text: '상품명' },
      { ...createNode('button'), text: '담기' }
    ]
  })

  return {
    type: 'page',
    id,
    title: 'Shop',
    children: [
      { ...createNode('text'), text: '전체 상품', style: { fontSize: 24, fontWeight: 700, color: '#1a1a1a' } },
      {
        ...createNode('container'),
        style: { ...createNode('container').style, flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
        children: [card(), card(), card()]
      }
    ]
  }
}

export function createPageFromTemplate(id, template, title) {
  switch (template) {
    case 'login':
      return { ...createLoginPageTemplate(id), title: title || 'Login' }
    case 'dashboard':
      return { ...createDashboardPageTemplate(id), title: title || 'Dashboard' }
    case 'landing':
      return { ...createLandingPageTemplate(id), title: title || 'Landing' }
    case 'ecommerce':
      return { ...createEcommercePageTemplate(id), title: title || 'Shop' }
    case 'blank':
    default:
      return createBlankPage(id, title || 'Untitled')
  }
}
