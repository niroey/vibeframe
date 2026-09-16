<script setup>
import { useProjectStore } from '../store/useProjectStore'
import PreviewNode from './PreviewNode.vue'

const store = useProjectStore()
</script>

<template>
  <div class="vf-preview">
    <div class="vf-preview-frame">
      <PreviewNode v-for="child in store.currentPage.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<style scoped>
.vf-preview {
  flex: 1;
  overflow: auto;
  background: #0c1018;
  display: flex;
  justify-content: center;
  padding: 32px;
}

.vf-preview-frame {
  width: 100%;
  max-width: 1100px;
  min-height: 100%;
  background: var(--bg-canvas);
  color: #1a1a1a;
  font-family: var(--font-content);
}
</style>
