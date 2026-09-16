<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import NewPageModal from './NewPageModal.vue'

const store = useProjectStore()
const showModal = ref(false)
</script>

<template>
  <footer class="vf-pages">
    <button
      v-for="p in store.pagesList"
      :key="p.id"
      class="vf-page-tab"
      :class="{ active: store.currentPageId === p.id }"
      @click="store.setCurrentPage(p.id)"
    >
      {{ p.title || p.id }}
    </button>
    <button class="vf-page-tab vf-page-add" @click="showModal = true">＋</button>

    <NewPageModal v-if="showModal" @close="showModal = false" />
  </footer>
</template>

<style scoped>
.vf-pages {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: var(--panel);
  border-top: 1px solid var(--border);
  overflow-x: auto;
}

.vf-page-tab {
  font-family: var(--font-ui);
  font-size: 12px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 6px 14px;
  border-radius: 6px;
  white-space: nowrap;
}
.vf-page-tab:hover {
  color: var(--text);
}
.vf-page-tab.active {
  background: var(--panel-alt);
  border-color: var(--border);
  color: var(--accent);
}
.vf-page-add {
  color: var(--accent);
  font-weight: 700;
}
</style>
