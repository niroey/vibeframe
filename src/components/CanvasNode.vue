<script setup>
import { computed, ref } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import { toCssStyle } from '../utils/styleUtils'
defineOptions({ name: 'CanvasNode' })
const props = defineProps({ node: { type: Object, required: true } })
const store = useProjectStore()
const dropIndex = ref(null)
const rendered = computed(() => store.resolveComponent(props.node))
const isContainer = computed(() => ['container', 'card', 'list', 'page'].includes(rendered.value.type))
const isSelected = computed(() => store.selectedId === props.node.id)
const cssStyle = computed(() => toCssStyle(rendered.value.style))
const editable = computed(() => Boolean(store.findNode(props.node.id)))
function select(e) { if (!editable.value) return; e.stopPropagation(); store.select(props.node.id) }
function startDrag(e) { if (!editable.value) return; e.stopPropagation(); e.dataTransfer.setData('application/vibeframe-node-id', props.node.id); e.dataTransfer.effectAllowed = 'move' }
function insertionIndex(e) { const children = [...e.currentTarget.querySelectorAll(':scope > .vf-child')]; const i = children.findIndex((el) => e.clientY < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2); return i < 0 ? children.length : i }
function onDragOver(e) { if (!isContainer.value) return; e.preventDefault(); e.stopPropagation(); dropIndex.value = insertionIndex(e); e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/vibeframe-node-id') ? 'move' : 'copy' }
function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) dropIndex.value = null }
function onDrop(e) {
  if (!isContainer.value || !editable.value) return
  e.preventDefault(); e.stopPropagation()
  const at = dropIndex.value ?? rendered.value.children?.length ?? 0
  const movedId = e.dataTransfer.getData('application/vibeframe-node-id')
  const type = e.dataTransfer.getData('application/vibeframe-type')
  const componentId = e.dataTransfer.getData('application/vibeframe-component-id')
  if (movedId) store.moveNode(movedId, props.node.id, at)
  else if (componentId) store.addComponentInstance(componentId, props.node.id, at)
  else if (type) store.addNode(type, props.node.id, at)
  dropIndex.value = null
}
function resizeStart(e) {
  e.preventDefault(); e.stopPropagation()
  const initial = rendered.value.style || {}, rect = e.currentTarget.parentElement.getBoundingClientRect(), startX = e.clientX, startY = e.clientY
  const move = (event) => store.resizeNode(props.node.id, { width: Math.max(24, Math.round((initial.width ?? rect.width) + event.clientX - startX)), height: Math.max(24, Math.round((initial.height ?? rect.height) + event.clientY - startY)) })
  const up = (event) => { move(event); const s = store.findNode(props.node.id)?.node?.style || {}; store.resizeNode(props.node.id, { width: s.width, height: s.height }, true); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
</script>
<template>
  <component :is="rendered.type === 'button' ? 'button' : rendered.type === 'image' ? 'img' : rendered.type === 'input' ? 'input' : rendered.type === 'icon' ? 'span' : 'div'" class="vf-node" :class="[{ selected: isSelected, 'vf-node-container': isContainer, empty: isContainer && !rendered.children?.length }, rendered.type]" :style="cssStyle" :src="rendered.type === 'image' ? rendered.src : undefined" :alt="rendered.type === 'image' ? '' : undefined" :placeholder="rendered.type === 'input' ? rendered.placeholder : undefined" :draggable="editable" @dragstart="startDrag" @click="select" @drop="onDrop" @dragover="onDragOver" @dragleave="onDragLeave">
    <template v-if="isContainer">
      <template v-for="(child, index) in rendered.children" :key="child.id"><div v-if="dropIndex === index" class="vf-insert-line">여기에 삽입</div><div class="vf-child"><CanvasNode :node="child" /></div></template>
      <div v-if="dropIndex === rendered.children?.length" class="vf-insert-line">여기에 삽입</div><span v-if="!rendered.children?.length" class="vf-empty-hint">여기로 요소를 드래그하세요</span>
    </template>
    <template v-else>{{ rendered.type === 'text' || rendered.type === 'button' ? rendered.text : rendered.type === 'icon' ? rendered.icon : '' }}</template>
    <span v-if="isSelected && rendered.type !== 'image' && rendered.type !== 'input'" class="vf-resize-handle" @pointerdown="resizeStart" title="드래그해서 크기 조절" />
  </component>
</template>
<style scoped>
.vf-node { position: relative; outline: 1px dashed transparent; box-sizing: border-box; }.vf-node:hover { outline-color: rgba(94,200,216,.5); }.vf-node.selected { outline: 2px solid var(--accent) !important; outline-offset: 1px; }.vf-node-container { min-height: 24px; }.vf-node-container.empty { min-height: 60px; display:flex;align-items:center;justify-content:center; }.vf-empty-hint { font:11px var(--font-ui);color:#b5bac4;pointer-events:none; }.vf-insert-line { height:22px;border-top:2px solid var(--accent);color:var(--accent);font:10px var(--font-ui);padding:2px 0; }.vf-resize-handle { position:absolute;z-index:10;width:11px;height:11px;right:-6px;bottom:-6px;background:var(--accent);border:2px solid white;border-radius:2px;cursor:nwse-resize; }
</style>
