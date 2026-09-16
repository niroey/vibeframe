<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import CanvasNode from './CanvasNode.vue'

const store = useProjectStore()
const breakpoint = ref('desktop') // 'desktop' | 'mobile' -- 문서 9번: MVP는 2단계만 지원

function onRootDrop(e) {
  e.preventDefault()
  const type = e.dataTransfer.getData('application/vibeframe-type')
  if (!type) return
  store.addNode(type, null)
}

function onRootDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

function onRootClick(e) {
  if (e.target === e.currentTarget) store.select(null)
}
</script>

<template>
  <section class="vf-canvas-wrap">
    <div class="vf-canvas-toolbar">
      <button class="vf-bp" :class="{ active: breakpoint === 'desktop' }" @click="breakpoint = 'desktop'">🖥 Desktop</button>
      <button class="vf-bp" :class="{ active: breakpoint === 'mobile' }" @click="breakpoint = 'mobile'">📱 Mobile</button>
    </div>

    <div class="vf-canvas-scroll">
      <div
        class="vf-canvas-frame"
        :class="breakpoint"
        @drop="onRootDrop"
        @dragover="onRootDragOver"
        @click="onRootClick"
      >
        <template v-if="store.currentPage.children.length">
          <CanvasNode v-for="child in store.currentPage.children" :key="child.id" :node="child" />
        </template>
        <div v-else class="vf-canvas-empty">
          왼쪽에서 컴포넌트를 드래그하거나 클릭해서 캔버스에 추가하세요.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.vf-canvas-wrap {
  background: #0c1018;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.vf-canvas-toolbar {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-soft);
}

.vf-bp {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 6px;
}
.vf-bp.active {
  color: var(--accent);
  border-color: var(--accent);
}

.vf-canvas-scroll {
  flex: 1;
  overflow: auto;
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.vf-canvas-frame {
  background: var(--bg-canvas);
  min-height: 640px;
  position: relative;
  box-shadow: 0 0 0 1px var(--border-soft), 0 20px 60px rgba(0, 0, 0, 0.45);
  transition: width 0.15s ease;
}

.vf-canvas-frame.desktop {
  width: 1100px;
}
.vf-canvas-frame.mobile {
  width: 375px;
}

.vf-canvas-empty {
  padding: 60px 20px;
  text-align: center;
  color: #9aa0ac;
  font-family: var(--font-ui);
  font-size: 12px;
}
</style>
