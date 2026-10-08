<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, Pencil, Circle, CircleCheck, X } from 'lucide-vue-next'
import { t } from '../i18n'
import { loadCustomSeries, saveCustomSeries, seriesMediaKey, toggleSeriesMember, type SeriesMedia, type CustomMediaSeries } from '../utils/customMediaSeries'
const item = ref<SeriesMedia | null>(null)
const groups = ref<CustomMediaSeries[]>([])
const editing = ref<string | null>(null)
const title = ref('')
const busy = ref(false)
const error = ref('')
function open(event: Event) { const target = (event as CustomEvent<SeriesMedia>).detail; if (!target?.id) return; groups.value = loadCustomSeries(); item.value = target; editing.value = null; error.value = '' }
onMounted(() => window.addEventListener('boxplayer:custom-series', open))
onUnmounted(() => window.removeEventListener('boxplayer:custom-series', open))
function start(id = '') { editing.value = id; title.value = groups.value.find(g => g.id === id)?.title || ''; error.value = '' }
async function commit(next: CustomMediaSeries[]) { if (busy.value) return; busy.value = true; error.value = ''; try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); saveCustomSeries(next); groups.value = next; editing.value = null } catch { error.value = t('customSeries.saveError') } finally { busy.value = false } }
function confirm() { const name = title.value.trim(); if (!name || !item.value) return; if (groups.value.some(g => g.title.toLocaleLowerCase() === name.toLocaleLowerCase() && g.id !== editing.value)) { error.value = t('customSeries.duplicate'); return } const next = editing.value ? groups.value.map(g => g.id === editing.value ? { ...g, title: name } : g) : [...groups.value, { id: crypto.randomUUID(), title: name, members: [{ ...item.value }] }]; void commit(next) }
function toggle(group: CustomMediaSeries) { if (item.value) void commit(groups.value.map(g => g.id === group.id ? toggleSeriesMember(g, item.value!) : g)) }
function selected(group: CustomMediaSeries) { return !!item.value && group.members.some(m => seriesMediaKey(m) === seriesMediaKey(item.value!)) }
</script>
<template>
<a-modal :visible="!!item" :width="620" :footer="false" :closable="false" :mask-closable="!busy" modal-class="custom-series-modal" @cancel="!busy && (item = null)">
<header><button :aria-label="t('common.cancel')" :disabled="busy" @click="item = null"><X :size="20" /></button><strong>{{ item?.title }}</strong></header>
<div class="custom-series-body"><button class="create-series" :disabled="busy" @click="start()"><Plus :size="18" />{{ t('customSeries.create') }}</button>
<div v-for="group in groups" :key="group.id" class="series-row"><button :disabled="busy" :aria-pressed="selected(group)" @click="toggle(group)"><CircleCheck v-if="selected(group)" class="selected" :size="18" /><Circle v-else :size="18" />{{ group.title }}</button><button :disabled="busy" :aria-label="t('customSeries.rename')" @click="start(group.id)"><Pencil :size="18" /></button></div>
<p v-if="error" role="alert">{{ error }}</p><a-spin v-if="busy" :tip="t('customSeries.updating')" /></div>
</a-modal>
<a-modal :visible="editing !== null" :width="320" :footer="false" :title="t('customSeries.title')" :mask-closable="!busy" :esc-to-close="!busy" @cancel="!busy && (editing = null)"><form @submit.prevent="confirm"><a-input v-model="title" autofocus :max-length="120" :disabled="busy" :aria-label="t('customSeries.title')" /><p v-if="error" role="alert">{{ error }}</p><a-button long html-type="submit" :disabled="!title.trim() || busy">{{ t('common.confirm') }}</a-button><a-button long :disabled="busy" @click="editing = null">{{ t('common.cancel') }}</a-button></form></a-modal>
</template>
<style scoped>
header{display:flex;align-items:center;justify-content:center;position:relative;height:36px}header button{position:absolute;left:0;border-radius:50%;padding:7px}button{border:0;cursor:pointer;background:transparent;color:var(--color-text-1)}button:disabled{cursor:wait;opacity:.6}.custom-series-body{min-height:520px;padding:32px 40px}.create-series,.series-row{display:flex;align-items:center;width:100%;border-radius:9px;background:var(--color-fill-3);margin-bottom:12px;min-height:48px}.create-series{gap:12px;padding:12px 16px;color:#ff8800}.series-row>button:first-child{display:flex;gap:12px;align-items:center;flex:1;text-align:left;padding:12px 16px}.series-row>button:last-child{padding:12px 16px;color:var(--color-text-3)}.selected{color:#ff8800}form{display:flex;flex-direction:column;gap:12px}p[role=alert]{color:rgb(var(--danger-6))}
</style>
