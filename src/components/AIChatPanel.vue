<script setup>
import { ref, nextTick, watch } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import { aiConfig } from '../config/aiConfig'

const store = useProjectStore()
const input = ref('')
const sending = ref(false)
const logEl = ref(null)

async function send() {
  const prompt = input.value.trim()
  if (!prompt || sending.value) return
  input.value = ''
  sending.value = true
  try {
    await store.runAICommand(prompt)
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  })
}

watch(() => store.chatLog.length, scrollToBottom)
</script>

<template>
  <div class="vf-ai">
    <p class="vf-panel-title">AI ASSISTANT</p>

    <div class="vf-ai-mode">
      {{ aiConfig.useRemoteBackend ? '실제 AI 백엔드 사용 중' : '로컬 시뮬레이션 모드 (server/ 설정 시 실제 AI로 전환)' }}
    </div>

    <div class="vf-ai-log" ref="logEl">
      <div v-for="(m, i) in store.chatLog" :key="i" class="vf-msg" :class="m.role">
        <span class="vf-msg-role">{{ m.role === 'ai' ? 'AI' : '사용자' }}</span>
        <p>{{ m.text }}</p>
      </div>
    </div>

    <div class="vf-ai-context" v-if="store.selectedNode">
      선택됨: <b>{{ store.selectedNode.type }}</b> ({{ store.selectedNode.id }})
    </div>

    <form class="vf-ai-input" @submit.prevent="send">
      <input v-model="input" placeholder="무엇을 만들어볼까요?" :disabled="sending" />
      <button class="vf-btn primary" type="submit" :disabled="sending">전송</button>
    </form>
  </div>
</template>

<style scoped>
.vf-ai {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.vf-ai-mode {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-muted);
  padding: 6px 14px;
  border-bottom: 1px solid var(--border-soft);
}

.vf-ai-log {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vf-msg {
  font-size: 12px;
  line-height: 1.5;
}
.vf-msg-role {
  display: block;
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.vf-msg.ai .vf-msg-role {
  color: var(--accent);
}
.vf-msg p {
  margin: 0;
  color: var(--text);
}

.vf-ai-context {
  font-size: 11px;
  color: var(--text-muted);
  padding: 6px 14px;
  border-top: 1px solid var(--border-soft);
}

.vf-ai-input {
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-soft);
}
.vf-ai-input input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 8px 10px;
  font-size: 12px;
}
.vf-ai-input input:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
