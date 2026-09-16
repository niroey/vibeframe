<script setup>
import { ref } from 'vue'

const emit = defineEmits(['start'])
const kind = ref('web')
const nickname = ref('')
const error = ref('')

function choose(k) {
  kind.value = k
}
function start() {
  const value = nickname.value.trim()
  if (!value) { error.value = '사용할 닉네임을 입력해주세요.'; return }
  emit('start', { kind: kind.value, nickname: value })
}
</script>

<template>
  <div class="vf-start">
    <div class="vf-start-card">
      <p class="vf-label">VIBEFRAME</p>
      <h1>무엇을 만들까요?</h1>
      <p class="vf-sub">드래그로 UI를 그리고, AI에게 자연어로 수정을 맡기고, 실행 가능한 코드를 내보내세요.</p>

      <label class="vf-nickname-label" for="nickname">사용할 닉네임을 입력해주세요</label>
      <input id="nickname" v-model="nickname" class="vf-nickname" maxlength="60" placeholder="예: minji" @keyup.enter="start" />
      <p v-if="error" class="vf-error">{{ error }}</p>

      <div class="vf-kind-row">
        <button class="vf-kind" :class="{ active: kind === 'web' }" @click="choose('web')">
          <span class="vf-kind-icon">🌐</span>
          <span>Web</span>
        </button>
        <button class="vf-kind" :class="{ active: kind === 'app' }" @click="choose('app')">
          <span class="vf-kind-icon">📱</span>
          <span>App</span>
        </button>
      </div>
      <p v-if="kind === 'app'" class="vf-note">
        App(모바일) 렌더러는 로드맵 항목입니다. 지금은 동일한 편집기를 모바일 기준 캔버스로 엽니다.
      </p>

      <button class="vf-btn primary vf-start-btn" @click="start">새 프로젝트 만들기</button>
    </div>
  </div>
</template>

<style scoped>
.vf-start {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(94, 200, 216, 0.08), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(242, 169, 60, 0.08), transparent 45%),
    var(--bg);
}

.vf-start-card {
  width: 420px;
  padding: 40px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
}

h1 {
  font-size: 24px;
  margin: 10px 0 6px;
}

.vf-sub {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 28px;
}

.vf-kind-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.vf-nickname-label { display:block; text-align:left; margin: 0 0 7px; color:var(--text); font: 12px var(--font-ui); }
.vf-nickname { width:100%; box-sizing:border-box; margin-bottom:16px; padding:11px 12px; background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:8px; font:13px var(--font-ui); }
.vf-nickname:focus { outline:none; border-color:var(--accent); }
.vf-error { text-align:left; color:var(--danger); font-size:11px; margin:-10px 0 10px; }

.vf-kind {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
}

.vf-kind-icon {
  font-size: 26px;
}

.vf-kind.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset;
}

.vf-note {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.vf-start-btn {
  width: 100%;
  padding: 12px 0;
  font-size: 13px;
  border-radius: 10px;
}
</style>
