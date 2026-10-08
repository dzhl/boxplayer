<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { t } from '../i18n'
import { readPersonalRatings, savePersonalRating } from '../utils/mediaPersonalRating'
const target = ref<{ id: string; name: string } | null>(null)
const rating = ref(0)
const error = ref('')
function open(event: Event) {
  const item = (event as CustomEvent).detail
  if (!item?.id || !item?.name) return
  target.value = item; error.value = ''
  try { rating.value = readPersonalRatings()[item.id] || 0 } catch { rating.value = 0; error.value = t('posterMenu.ratingSaveError') }
}
function save() { if (!target.value || !rating.value) return; try { savePersonalRating(target.value.id, rating.value); target.value = null } catch { error.value = t('posterMenu.ratingSaveError') } }
onMounted(() => window.addEventListener('boxplayer:personal-rating', open))
onUnmounted(() => window.removeEventListener('boxplayer:personal-rating', open))
</script>
<template><a-modal :visible="!!target" :title="t('posterMenu.personalRating')" :footer="false" :width="420" @cancel="target = null"><div class="personal-rating"><strong>{{ target?.name }}</strong><a-rate v-model="rating" :count="10" :allow-half="false" /><small>{{ t('posterMenu.personalRatingNote') }}</small><p v-if="error" role="alert">{{ error }}</p><div><a-button @click="target = null">{{ t('common.cancel') }}</a-button><a-button type="primary" :disabled="rating < 1" @click="save">{{ t('posterMenu.rating') }}</a-button></div></div></a-modal></template>
<style scoped>.personal-rating{display:flex;flex-direction:column;gap:20px}.personal-rating small{color:var(--color-text-3)}.personal-rating>div{display:flex;justify-content:flex-end;gap:12px}.personal-rating :deep(.arco-rate){color:#ff8800}</style>
