<script setup>
import { ref } from 'vue'
import { useProjectStore } from '../store/useProjectStore'

const emit = defineEmits(['close'])
const store = useProjectStore()

const name = ref('')
const template = ref('blank')

const templates = [
  { id: 'blank', label: 'Blank' },
  { id: 'login', label: 'Login' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'landing', label: 'Landing Page' },
  { id: 'ecommerce', label: 'E-commerce' }
]

function create() {
  const title = name.value.trim() || 'Untitled'
  store.addPage(title, template.value)
  emit('close')
}
</script>

<template>
  <div class="vf-modal-backdrop" @click.self="$emit('close')">
    <div class="vf-modal">
      <p class="vf-panel-title">새 페이지</p>
      <div class="vf-modal-body">
        <div class="vf-field">
          <label>Page name</label>
          <input v-model="name" placeholder="Payment" autofocus />
        </div>
        <div class="vf-field">
          <label>Template</label>
          <div class="vf-template-list">
            <label v-for="t in templates" :key="t.id" class="vf-radio">
              <input type="radio" name="template" :value="t.id" v-model="template" />
              {{ t.label }}
            </label>
          </div>
        </div>
      </div>
      <div class="vf-modal-actions">
        <button class="vf-btn" @click="$emit('close')">취소</button>
        <button class="vf-btn primary" @click="create">만들기</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vf-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.vf-modal {
  width: 320px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.vf-modal-body {
  padding: 16px;
}

.vf-template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vf-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.vf-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-soft);
}
</style>
