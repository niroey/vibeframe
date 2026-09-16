<script setup>
import { computed } from 'vue'
import { useProjectStore } from '../store/useProjectStore'
import { toCssStyle } from '../utils/styleUtils'

defineOptions({ name: 'PreviewNode' })

const props = defineProps({
  node: { type: Object, required: true }
})

const store = useProjectStore()
const rendered = computed(() => store.resolveComponent(props.node))
const cssStyle = computed(() => toCssStyle(rendered.value.style))

function handleClick() {
  const action = rendered.value.action
  if (!action || action.type === 'none' || !action.target) return
  if (action.type === 'navigate') store.setCurrentPage(action.target)
  else if (action.type === 'openUrl') window.open(action.target, '_blank')
}
</script>

<template>
  <div v-if="rendered.type === 'text'" :style="cssStyle">{{ rendered.text }}</div>

  <button v-else-if="rendered.type === 'button'" :style="cssStyle" @click="handleClick">{{ rendered.text }}</button>

  <img v-else-if="rendered.type === 'image'" :style="cssStyle" :src="rendered.src" alt="" />

  <input v-else-if="rendered.type === 'input'" :style="cssStyle" :placeholder="rendered.placeholder" />

  <span v-else-if="rendered.type === 'icon'" :style="cssStyle">{{ rendered.icon }}</span>

  <div v-else :style="cssStyle">
    <PreviewNode v-for="child in rendered.children" :key="child.id" :node="child" />
  </div>
</template>
