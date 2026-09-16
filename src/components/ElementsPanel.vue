<script setup>
import { PALETTE } from '../utils/nodeFactory'
import { useProjectStore } from '../store/useProjectStore'

const store = useProjectStore()

function onDragStart(e, type) {
  e.dataTransfer.setData('application/vibeframe-type', type)
  e.dataTransfer.effectAllowed = 'copy'
}

function onClickAdd(type) {
  // 드래그가 번거로운 경우를 위한 클릭 추가(현재 선택된 컨테이너, 없으면 페이지 루트)
  const selected = store.selectedNode
  const containerId = selected && selected.children ? selected.id : null
  store.addNode(type, containerId)
}
function onComponentDrag(e, componentId) {
  e.dataTransfer.setData('application/vibeframe-component-id', componentId)
  e.dataTransfer.effectAllowed = 'copy'
}
function deleteComponent(component, e) {
  e.stopPropagation()
  if (window.confirm(`“${component.name}” 및 모든 인스턴스를 삭제할까요?`)) store.deleteComponent(component.id)
}
</script>

<template>
  <aside class="vf-elements">
    <p class="vf-panel-title">ELEMENTS</p>
    <div class="vf-palette">
      <div
        v-for="item in PALETTE"
        :key="item.type"
        class="vf-palette-item"
        draggable="true"
        @dragstart="onDragStart($event, item.type)"
        @click="onClickAdd(item.type)"
        :title="`드래그해서 캔버스에 놓거나 클릭하여 추가: ${item.label}`"
      >
        <span class="vf-palette-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>
    <template v-if="Object.keys(store.document.components || {}).length">
      <p class="vf-panel-title">MY COMPONENTS</p>
      <div class="vf-palette">
        <div v-for="component in store.document.components" :key="component.id" class="vf-palette-item" draggable="true" @dragstart="onComponentDrag($event, component.id)" @click="store.addComponentInstance(component.id, store.selectedNode?.children ? store.selectedNode.id : null)">
          <span class="vf-palette-icon">◇</span><span>{{ component.name }}</span><select class="vf-variant" @click.stop @change="store.addVariant(component.id, $event.target.value || undefined)"><option value="">+ Variant</option><option v-for="(_, key) in component.variants" :key="key" :value="key">복제: {{ key }}</option></select><button class="vf-component-delete" title="컴포넌트와 인스턴스 삭제" @click="deleteComponent(component, $event)">×</button>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.vf-elements {
  border-right: 1px solid var(--border);
  background: var(--panel);
  overflow-y: auto;
}

.vf-palette {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vf-palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  background: var(--panel-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--text);
  cursor: grab;
  user-select: none;
}
.vf-palette-item:hover {
  border-color: var(--accent);
}
.vf-palette-item:active {
  cursor: grabbing;
}

.vf-palette-icon {
  width: 18px;
  text-align: center;
  color: var(--line);
}
.vf-variant { margin-left: auto; max-width: 74px; background: var(--panel); color: var(--text-muted); border: 1px solid var(--border); font-size: 10px; }
.vf-component-delete { color: var(--danger); border: 0; background: transparent; font-size: 18px; line-height: 1; cursor: pointer; }
</style>
