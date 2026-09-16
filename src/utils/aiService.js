import { aiConfig } from '../config/aiConfig'

const COLOR_WORDS = [
  { words: ['빨간', '빨강', '레드', 'red'], hex: '#e8564f' },
  { words: ['파란', '파랑', '블루', 'blue'], hex: '#3b82f6' },
  { words: ['초록', '녹색', '그린', 'green'], hex: '#22c55e' },
  { words: ['노란', '노랑', '옐로', 'yellow'], hex: '#eab308' },
  { words: ['보라', '퍼플', 'purple'], hex: '#8b5cf6' },
  { words: ['검정', '검은', '블랙', 'black'], hex: '#111827' },
  { words: ['흰', '화이트', 'white'], hex: '#ffffff' },
  { words: ['회색', '그레이', 'gray', 'grey'], hex: '#6b7280' },
  { words: ['주황', '오렌지', 'orange'], hex: '#f97316' }
]

/**
 * 실제 API 연동 지점.
 * server/server.js 의 /api/ai/edit 로 프록시 요청을 보냅니다.
 * (브라우저에서 Anthropic API를 직접 호출하면 CORS와 키 노출 문제가
 *  생기기 때문에, 반드시 백엔드를 경유하도록 설계했습니다.)
 */
async function callRemoteAI(prompt, context) {
  if (!aiConfig.useRemoteBackend) return null
  try {
    const res = await fetch(aiConfig.backendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context })
    })
    if (!res.ok) return null
    const data = await res.json()
    // 백엔드는 { reply: string, patch: {...} } 형태로 응답해야 합니다.
    if (data && data.reply && data.patch) return data
    return null
  } catch (err) {
    console.warn('[VibeFrame] AI 백엔드 호출 실패, 로컬 시뮬레이션으로 대체합니다.', err)
    return null
  }
}

/** 키/백엔드가 없을 때 쓰는 아주 단순한 규칙 기반 로컬 시뮬레이터 */
function localRuleEngine(prompt, context) {
  const text = prompt.trim()
  const lower = text.toLowerCase()

  // 1) 색상 변경: "버튼 색깔 빨간색으로 바꿔"
  for (const c of COLOR_WORDS) {
    if (c.words.some((w) => lower.includes(w))) {
      if (!context.selectedElement) {
        return { reply: '먼저 캔버스에서 요소를 선택해주세요.', patch: { kind: 'none' } }
      }
      return {
        reply: `선택한 요소의 색상을 ${c.hex} 로 바꿨어요.`,
        patch: { kind: 'style', style: { background: c.hex } }
      }
    }
  }

  // 2) 크기 변경: "크게 해줘" / "작게 해줘"
  if (text.includes('크게')) {
    if (!context.selectedElement) return { reply: '먼저 요소를 선택해주세요.', patch: { kind: 'none' } }
    return { reply: '요소 크기를 키웠어요.', patch: { kind: 'resize', factor: 1.3 } }
  }
  if (text.includes('작게')) {
    if (!context.selectedElement) return { reply: '먼저 요소를 선택해주세요.', patch: { kind: 'none' } }
    return { reply: '요소 크기를 줄였어요.', patch: { kind: 'resize', factor: 0.75 } }
  }

  // 3) 텍스트 변경: 따옴표로 감싼 텍스트가 있으면 그걸로 교체
  const quoted = text.match(/["'“”](.+?)["'“”]/)
  if (quoted && (text.includes('바꿔') || text.includes('변경') || text.includes('수정'))) {
    if (!context.selectedElement) return { reply: '먼저 텍스트를 바꿀 요소를 선택해주세요.', patch: { kind: 'none' } }
    return { reply: `텍스트를 "${quoted[1]}" 로 바꿨어요.`, patch: { kind: 'text', text: quoted[1] } }
  }

  // 4) 페이지 생성
  if (text.includes('페이지') && (text.includes('만들') || text.includes('생성'))) {
    if (text.includes('로그인')) return { reply: '로그인 페이지를 생성했습니다.', patch: { kind: 'createPage', template: 'login', title: 'Login' } }
    if (text.includes('대시보드')) return { reply: '대시보드 페이지를 생성했습니다.', patch: { kind: 'createPage', template: 'dashboard', title: 'Dashboard' } }
    if (text.includes('랜딩')) return { reply: '랜딩 페이지를 생성했습니다.', patch: { kind: 'createPage', template: 'landing', title: 'Landing' } }
    if (text.includes('쇼핑') || text.includes('이커머스') || text.includes('상품'))
      return { reply: '쇼핑몰 상품 목록 페이지를 생성했습니다.', patch: { kind: 'createPage', template: 'ecommerce', title: 'Shop' } }
    return { reply: '새 빈 페이지를 생성했습니다.', patch: { kind: 'createPage', template: 'blank', title: '새 페이지' } }
  }

  // 5) 이동 액션 연결: "로그인 버튼 누르면 Dashboard로 이동하게 해줘"
  const navMatch = lower.match(/([a-z가-힣0-9_-]+)\s*(?:으로|로)\s*이동/)
  if (navMatch) {
    if (!context.selectedElement) return { reply: '먼저 클릭할 버튼(요소)을 선택해주세요.', patch: { kind: 'none' } }
    const targetName = navMatch[1]
    const targetPage =
      context.pageList?.find((id) => id.toLowerCase() === targetName) ||
      context.pageList?.find((id) => targetName.includes(id)) ||
      targetName
    return {
      reply: `클릭하면 "${targetPage}" 페이지로 이동하도록 연결했어요.`,
      patch: { kind: 'action', action: { type: 'navigate', target: targetPage } }
    }
  }

  // 6) 삭제
  if (text.includes('삭제') || text.includes('지워')) {
    if (!context.selectedElement) return { reply: '먼저 삭제할 요소를 선택해주세요.', patch: { kind: 'none' } }
    return { reply: '선택한 요소를 삭제했어요.', patch: { kind: 'delete' } }
  }

  return {
    reply:
      '이해하지 못했어요. 예: "버튼 색깔 빨간색으로 바꿔", "로그인 페이지 만들어줘", "크게 해줘", "대시보드로 이동하게 해줘" 처럼 말해보세요. (현재는 로컬 시뮬레이션 모드입니다 — 실제 AI를 쓰려면 server/README를 확인하세요)',
    patch: { kind: 'none' }
  }
}

export async function processAICommand(prompt, context) {
  const remote = await callRemoteAI(prompt, context)
  if (remote) return remote
  return localRuleEngine(prompt, context)
}
