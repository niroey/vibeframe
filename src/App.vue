<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from './store/useProjectStore'
import StartScreen from './components/StartScreen.vue'
import TopBar from './components/TopBar.vue'
import ElementsPanel from './components/ElementsPanel.vue'
import Canvas from './components/Canvas.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import AIChatPanel from './components/AIChatPanel.vue'
import PagesTabs from './components/PagesTabs.vue'
import PreviewMode from './components/PreviewMode.vue'

const store = useProjectStore()
const started = ref(false)
const rightTab = ref('properties') // 'properties' | 'ai'

async function handleStart({ nickname }) {
  try {
    await store.login(nickname)
    started.value = true
  } catch (err) {
    alert(err.message || '서버 연결을 확인하세요.')
  }
}

function onKeydown(e) {
  const meta = e.ctrlKey || e.metaKey
  if (!meta) return
  const key = e.key.toLowerCase()
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
  } else if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault()
    store.redo()
  }
}

onMounted(() => {
  store.init()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <StartScreen v-if="!started" @start="handleStart" />

  <div v-else class="vf-app">
    <TopBar />

    <template v-if="store.mode === 'edit'">
      <div class="vf-body">
        <ElementsPanel />
        <Canvas />
        <aside class="vf-right">
          <div class="vf-right-tabs">
            <button
              class="vf-tab"
              :class="{ active: rightTab === 'properties' }"
              @click="rightTab = 'properties'"
            >
              PROPERTIES
            </button>
            <button class="vf-tab" :class="{ active: rightTab === 'ai' }" @click="rightTab = 'ai'">
              AI ASSISTANT
            </button>
          </div>
          <PropertiesPanel v-show="rightTab === 'properties'" />
          <AIChatPanel v-show="rightTab === 'ai'" />
        </aside>
      </div>
      <PagesTabs />
    </template>

    <PreviewMode v-else />
  </div>
</template>

<style>
.vf-app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vf-body {
  flex: 1;
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  min-height: 0;
}

.vf-right {
  border-left: 1px solid var(--border);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.vf-right-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}

.vf-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: 11px;
  letter-spacing: 0.04em;
  padding: 10px 6px;
  border-bottom: 2px solid transparent;
}

.vf-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>

// coderabbit 추가해봄