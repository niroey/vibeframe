<script setup>
import { computed } from 'vue'
import { useProjectStore } from '../store/useProjectStore'

const store = useProjectStore()

const node = computed(() => store.selectedNode)

function updateStyle(key, value, numeric = false) {
  if (!node.value) return
  const v = numeric ? Number(value) : value
  const style = { [key]: v }
  // div에는 기본 border가 없으므로 색만 고른 경우에도 즉시 보이게 합니다.
  if (key === 'borderColor') {
    style.borderStyle = 'solid'
    if (!node.value.style?.borderWidth) style.borderWidth = 1
  }
  store.updateNode(node.value.id, { style })
}

function updateField(key, value) {
  if (!node.value) return
  store.updateNode(node.value.id, { [key]: value })
}

function updateActionType(type) {
  if (!node.value) return
  store.setAction(node.value.id, { type, target: type === 'none' ? null : node.value.action?.target || null })
}

function updateActionTarget(target) {
  if (!node.value) return
  store.setAction(node.value.id, { type: node.value.action?.type || 'navigate', target })
}

function remove() {
  if (!node.value) return
  store.deleteNode(node.value.id)
}

async function uploadImage(e) {
  const file = e.target.files?.[0]
  if (!file || !node.value) return
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
  try {
    const response = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, dataUrl }) })
    if (!response.ok) throw new Error('업로드 서버를 확인하세요.')
    updateField('src', (await response.json()).url)
  } catch (err) { alert(`업로드 실패: ${err.message}`) }
}

function makeComponent() {
  if (!node.value) return
  const name = window.prompt('재사용할 컴포넌트 이름', `My ${node.value.type}`)
  if (name) store.createComponent(node.value.id, name)
}
</script>

<template>
  <div class="vf-properties">
    <p class="vf-panel-title">PROPERTIES</p>

    <div v-if="!node" class="vf-empty">캔버스에서 요소를 선택하세요.</div>

    <div v-else class="vf-props-body">
      <p class="vf-type-badge">{{ node.type }}</p>

      <!-- 공통: 텍스트 콘텐츠 -->
      <div v-if="node.type === 'text' || node.type === 'button'" class="vf-field">
        <label>Text</label>
        <input :value="node.text" @change="updateField('text', $event.target.value)" />
      </div>

      <div v-if="node.type === 'input'" class="vf-field">
        <label>Placeholder</label>
        <input :value="node.placeholder" @change="updateField('placeholder', $event.target.value)" />
      </div>

      <div v-if="node.type === 'image'" class="vf-field">
        <label>Image URL</label>
        <input :value="node.src" @change="updateField('src', $event.target.value)" />
        <input type="file" accept="image/*" @change="uploadImage" />
      </div>

      <template v-if="node.type === 'component'">
        <div class="vf-field"><label>Variant</label><select :value="node.variant" @change="store.setComponentVariant(node.id, $event.target.value)"><option v-for="(_, key) in store.document.components?.[node.componentId]?.variants" :key="key" :value="key">{{ key }}</option></select></div>
      </template>

      <div v-if="node.type === 'icon'" class="vf-field">
        <label>Icon (문자/이모지)</label>
        <input :value="node.icon" @change="updateField('icon', $event.target.value)" />
      </div>

      <div class="vf-field-row">
        <div class="vf-field">
          <label>Width</label>
          <input type="number" :value="node.style?.width" @change="updateStyle('width', $event.target.value, true)" />
        </div>
        <div class="vf-field">
          <label>Height</label>
          <input type="number" :value="node.style?.height" @change="updateStyle('height', $event.target.value, true)" />
        </div>
      </div>

      <div class="vf-field" v-if="'fontSize' in (node.style || {})">
        <label>Font size</label>
        <input type="number" :value="node.style?.fontSize" @change="updateStyle('fontSize', $event.target.value, true)" />
      </div>

      <div class="vf-field" v-if="['text', 'button', 'icon', 'input'].includes(node.type)">
        <label>Text color</label>
        <input type="color" :value="node.style?.color || '#000000'" @change="updateStyle('color', $event.target.value)" />
      </div>

      <div class="vf-field" v-if="['button', 'card', 'container', 'input'].includes(node.type)">
        <label>Background</label>
        <input type="color" :value="node.style?.background || '#ffffff'" @change="updateStyle('background', $event.target.value)" />
      </div>

      <div class="vf-field" v-if="['button', 'card', 'container', 'image', 'input', 'list'].includes(node.type)">
        <label>Radius</label>
        <input type="number" :value="node.style?.borderRadius" @change="updateStyle('borderRadius', $event.target.value, true)" />
      </div>

      <div class="vf-field-row" v-if="['button', 'card', 'container', 'image', 'input', 'list'].includes(node.type)">
        <div class="vf-field"><label>Border</label><input type="color" :value="node.style?.borderColor || '#cbd5e1'" @change="updateStyle('borderColor', $event.target.value)" /></div>
        <div class="vf-field"><label>Border width</label><input type="number" min="0" :value="node.style?.borderWidth ?? 0" @change="updateStyle('borderWidth', $event.target.value, true); updateStyle('borderStyle', 'solid')" /></div>
      </div>

      <template v-if="['container', 'card', 'list'].includes(node.type)">
        <div class="vf-field-row">
          <div class="vf-field">
            <label>Padding</label>
            <input type="number" :value="node.style?.padding" @change="updateStyle('padding', $event.target.value, true)" />
          </div>
          <div class="vf-field">
            <label>Gap</label>
            <input type="number" :value="node.style?.gap" @change="updateStyle('gap', $event.target.value, true)" />
          </div>
        </div>
        <div class="vf-field">
          <label>Direction</label>
          <select :value="node.style?.flexDirection || 'column'" @change="updateStyle('flexDirection', $event.target.value)">
            <option value="column">Column (세로)</option>
            <option value="row">Row (가로)</option>
          </select>
        </div>
      </template>

      <!-- 액션: 버튼만 -->
      <template v-if="node.type === 'button'">
        <p class="vf-section-label">ACTION</p>
        <div class="vf-field">
          <label>On Click</label>
          <select :value="node.action?.type || 'none'" @change="updateActionType($event.target.value)">
            <option value="none">None</option>
            <option value="navigate">Navigate</option>
            <option value="openUrl">Open URL</option>
            <option value="submit">Submit</option>
            <option value="showModal">Show Modal</option>
          </select>
        </div>
        <div class="vf-field" v-if="node.action?.type === 'navigate'">
          <label>Navigate to</label>
          <select :value="node.action?.target || ''" @change="updateActionTarget($event.target.value)">
            <option value="" disabled>페이지 선택</option>
            <option v-for="p in store.pagesList" :key="p.id" :value="p.id">{{ p.title || p.id }}</option>
          </select>
        </div>
        <div class="vf-field" v-if="node.action?.type === 'openUrl'">
          <label>URL</label>
          <input :value="node.action?.target || ''" @change="updateActionTarget($event.target.value)" placeholder="https://..." />
        </div>
      </template>

      <button class="vf-btn vf-delete-btn" @click="remove">🗑 요소 삭제</button>
      <button v-if="['container', 'card', 'list'].includes(node.type)" class="vf-btn vf-component-btn" @click="makeComponent">◇ 재사용 컴포넌트로 만들기</button>
    </div>
  </div>
</template>

<style scoped>
.vf-properties {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.vf-empty {
  padding: 20px 14px;
  color: var(--text-muted);
  font-size: 12px;
  font-family: var(--font-ui);
}

.vf-props-body {
  padding: 14px;
}

.vf-type-badge {
  display: inline-block;
  font-family: var(--font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 2px 8px;
  margin-bottom: 14px;
}

.vf-section-label {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  margin: 14px 0 8px;
  border-top: 1px solid var(--border-soft);
  padding-top: 12px;
}

.vf-delete-btn {
  width: 100%;
  margin-top: 10px;
  color: var(--danger);
  border-color: var(--danger);
}
.vf-component-btn { width: 100%; margin-top: 8px; }
</style>
