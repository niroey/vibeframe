<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import { exportAsReactProject } from '../utils/exportReact'
import { exportAsFlutterProject } from '../utils/exportFlutter'

const store = useProjectStore()
const exporting = ref(false)
const showExportMenu = ref(false)

async function doExport(format) {
  showExportMenu.value = false
  exporting.value = true
  try {
    if (format === 'flutter') await exportAsFlutterProject(store.document, 'vibeframe-flutter')
    else await exportAsReactProject(store.document, 'vibeframe-export')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <header class="vf-topbar">
    <div class="vf-topbar-left">
      <span class="vf-brand">VibeFrame</span>
      <span class="vf-project-name">My Project</span>
    </div>

    <div class="vf-topbar-mid">
      <button class="vf-btn" :disabled="!store.canUndo" @click="store.undo()" title="Ctrl+Z">↺ Undo</button>
      <button class="vf-btn" :disabled="!store.canRedo" @click="store.redo()" title="Ctrl+Shift+Z">↻ Redo</button>
    </div>

    <div class="vf-topbar-right">
      <div class="vf-mode-toggle">
        <button class="vf-btn" :class="{ active: store.mode === 'edit' }" @click="store.setMode('edit')">Edit</button>
        <button class="vf-btn" :class="{ active: store.mode === 'preview' }" @click="store.setMode('preview')">Preview</button>
      </div>

      <div class="vf-export-wrap">
        <button class="vf-btn primary" :disabled="exporting" @click="showExportMenu = !showExportMenu">
          {{ exporting ? '내보내는 중…' : 'Export' }}
        </button>
        <div v-if="showExportMenu" class="vf-export-menu">
          <button class="vf-export-item" @click="doExport('react')">⚛ React 프로젝트로 내보내기 (.zip)</button>
          <button class="vf-export-item" @click="doExport('flutter')">📱 Flutter 앱으로 내보내기 (.zip)</button>
          <p class="vf-export-hint">package.json, App.tsx, pages/*.tsx 형태로 생성됩니다.</p>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.vf-topbar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.vf-topbar-left,
.vf-topbar-mid,
.vf-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vf-brand {
  font-family: var(--font-ui);
  font-weight: 700;
  color: var(--accent);
  font-size: 13px;
}

.vf-project-name {
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--text-muted);
  padding-left: 10px;
  border-left: 1px solid var(--border);
}

.vf-mode-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.vf-mode-toggle .vf-btn {
  border: none;
  border-radius: 0;
}
.vf-mode-toggle .vf-btn.active {
  background: var(--accent);
  color: var(--accent-ink);
}

.vf-export-wrap {
  position: relative;
}

.vf-export-menu {
  position: absolute;
  right: 0;
  top: 34px;
  width: 240px;
  background: var(--panel-alt);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  z-index: 20;
}

.vf-export-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 12px;
  padding: 8px;
  border-radius: 6px;
}
.vf-export-item:hover {
  background: var(--bg);
}

.vf-export-hint {
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 8px 2px;
}
</style>
