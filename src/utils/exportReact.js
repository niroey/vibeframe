import JSZip from 'jszip'
import { saveAs } from 'file-saver'

function toCamel(id) {
  return id.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
}

function expandComponents(documentJson) {
  const expand = (node) => {
    if (node.type === 'component') {
      const component = documentJson.components?.[node.componentId]
      const source = component?.variants?.[node.variant] || component?.variants?.[component?.defaultVariant]
      if (!source) return { type: 'text', text: 'Missing component', style: {} }
      return expand({ ...source, id: node.id, style: { ...source.style, ...node.style } })
    }
    return { ...node, children: node.children?.map(expand) }
  }
  return { ...documentJson, pages: Object.fromEntries(Object.entries(documentJson.pages).map(([id, page]) => [id, { ...page, children: page.children.map(expand) }])) }
}

function pascalCase(id) {
  const camel = toCamel(id)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/** style 객체(px 숫자 포함) -> JSX 인라인 style 리터럴 문자열 */
function styleToJs(style = {}) {
  const entries = Object.entries(style).map(([k, v]) => {
    if (typeof v === 'number') return `${k}: ${v}`
    return `${k}: ${JSON.stringify(v)}`
  })
  return `{ ${entries.join(', ')} }`
}

function actionToHandler(node) {
  if (!node.action || node.action.type === 'none' || !node.action.target) return null
  if (node.action.type === 'navigate') {
    return `() => navigate('/${node.action.target}')`
  }
  if (node.action.type === 'openUrl') {
    return `() => window.open(${JSON.stringify(node.action.target)}, '_blank')`
  }
  return null
}

/** UI Tree 노드 한 개를 JSX 문자열로 변환 (재귀) */
function nodeToJSX(node, indent = 6) {
  const pad = ' '.repeat(indent)
  const style = styleToJs(node.style)

  switch (node.type) {
    case 'text':
      return `${pad}<div style={${style}}>${escapeText(node.text)}</div>`

    case 'button': {
      const handler = actionToHandler(node)
      const onClick = handler ? ` onClick={${handler}}` : ''
      return `${pad}<button style={${style}}${onClick}>${escapeText(node.text)}</button>`
    }

    case 'image':
      return `${pad}<img src={${JSON.stringify(node.src)}} style={${style}} alt="" />`

    case 'input':
      return `${pad}<input placeholder={${JSON.stringify(node.placeholder || '')}} style={${style}} />`

    case 'icon':
      return `${pad}<span style={${style}}>${escapeText(node.icon)}</span>`

    case 'container':
    case 'card':
    case 'list': {
      const children = (node.children || []).map((c) => nodeToJSX(c, indent + 2)).join('\n')
      return `${pad}<div style={${style}}>\n${children}\n${pad}</div>`
    }

    default:
      return `${pad}{/* unsupported node type: ${node.type} */}`
  }
}

function escapeText(t = '') {
  return String(t).replace(/[{}<>]/g, (m) => ({ '{': '&#123;', '}': '&#125;', '<': '&lt;', '>': '&gt;' }[m]))
}

function pageToComponent(page) {
  const name = pascalCase(page.id)
  const usesNavigate = JSON.stringify(page).includes('"navigate"')
  const body = (page.children || []).map((c) => nodeToJSX(c, 6)).join('\n')

  return `import React from 'react'
${usesNavigate ? "import { useNavigate } from 'react-router-dom'\n" : ''}
export default function ${name}() {
${usesNavigate ? '  const navigate = useNavigate()\n' : ''}
  return (
    <div className="vf-page">
${body}
    </div>
  )
}
`
}

function appTsx(order, pages) {
  const imports = order.map((id) => `import ${pascalCase(id)} from './pages/${pascalCase(id)}'`).join('\n')
  const routes = order
    .map((id, i) => `        <Route path="${i === 0 ? '/' : '/' + id}" element={<${pascalCase(id)} />} />`)
    .join('\n')

  return `import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
${imports}
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
${routes}
      </Routes>
    </BrowserRouter>
  )
}
`
}

const GLOBAL_CSS = `* { box-sizing: border-box; }
body { margin: 0; font-family: 'Pretendard', -apple-system, sans-serif; background: #f4f5f7; }
.vf-page { min-height: 100vh; }
button { cursor: pointer; border: none; }
input { font-family: inherit; }
`

const MAIN_TSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`

const INDEX_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VibeFrame Export</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

function packageJson(projectName) {
  return JSON.stringify(
    {
      name: projectName || 'vibeframe-export',
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.23.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.1',
        typescript: '^5.4.0',
        vite: '^5.2.0'
      }
    },
    null,
    2
  )
}

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
`

/**
 * documentJson({ pages, order })을 실행 가능한 React 프로젝트로 변환해
 * zip으로 다운로드합니다. (스펙 문서 16번 Export)
 */
export async function exportAsReactProject(documentJson, projectName = 'vibeframe-export') {
  documentJson = expandComponents(documentJson)
  const zip = new JSZip()
  const root = zip.folder(projectName)

  root.file('package.json', packageJson(projectName))
  root.file('vite.config.js', VITE_CONFIG)
  root.file('index.html', INDEX_HTML)
  root.file('tsconfig.json', JSON.stringify({ compilerOptions: { jsx: 'react-jsx', target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler', strict: false } }, null, 2))

  const src = root.folder('src')
  src.file('main.tsx', MAIN_TSX)
  src.file('App.tsx', appTsx(documentJson.order, documentJson.pages))
  src.folder('styles').file('global.css', GLOBAL_CSS)

  const pagesFolder = src.folder('pages')
  documentJson.order.forEach((id) => {
    const page = documentJson.pages[id]
    pagesFolder.file(`${pascalCase(id)}.tsx`, pageToComponent(page))
  })

  root.file(
    'README.md',
    `# ${projectName}\n\nVibeFrame에서 내보낸 React 프로젝트입니다.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${projectName}.zip`)
}
