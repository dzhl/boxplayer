<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, GripHorizontal, Minus, Pencil, Plus, X } from 'lucide-vue-next'
import { t } from '../i18n'
import { homeItemTitle, homeMenuTitle, mergeHomeOrder, moveHomeItem, visibleHomeItems, type HomeManagementGroup, type HomeManagementItem, type HomeManagementNode, type UnifiedHomeSettings } from '../utils/unifiedHomeManagement'

const props = defineProps<{ items: HomeManagementItem[]; groups: HomeManagementGroup[]; settings: UnifiedHomeSettings }>()
const emit = defineEmits<{ (event: 'save', value: UnifiedHomeSettings): void; (event: 'close'): void; (event: 'reset'): void; (event: 'rename', id: string, title: string): void }>()
const draft = ref<UnifiedHomeSettings>({ order: mergeHomeOrder(props.settings.order, props.items), hidden: [...props.settings.hidden], titles: { ...props.settings.titles } })
const editing = ref(false)
const path = ref<HomeManagementNode[]>([])
const dragged = ref('')
const renameTarget = ref<HomeManagementItem>()
const renameText = ref('')
const visible = computed(() => visibleHomeItems(props.items, draft.value))
const displayNodes = computed<HomeManagementNode[]>(() => {
  const flatten = (nodes: HomeManagementNode[]): HomeManagementNode[] => nodes.flatMap(node => [node, ...flatten(node.children || [])])
  const byId = new Map(props.groups.flatMap(group => flatten(group.nodes)).map(node => [node.id, node]))
  return visibleHomeItems(props.items, props.settings).map(item => ({ id: item.id, title: item.title, item, children: byId.get(item.id)?.children }))
})
const currentNodes = computed(() => path.value.at(-1)?.children || [])
const currentTitle = computed(() => path.value.at(-1)?.title || t('nav.home'))
function title(item: HomeManagementItem) { return homeItemTitle(item, draft.value) }
function toggle(item: HomeManagementItem) {
  draft.value.hidden = draft.value.hidden.includes(item.id) ? draft.value.hidden.filter(id => id !== item.id) : [...draft.value.hidden, item.id]
}
function save() { emit('save', draft.value); emit('close') }
function move(id: string, target: string) {
  draft.value = moveHomeItem(draft.value, visible.value.map(item => item.id), id, target)
  emit('save', draft.value)
}
function moveBy(id: string, delta: number) {
  const index = visible.value.findIndex(item => item.id === id)
  const target = visible.value[index + delta]
  if (target) move(id, target.id)
}
function beginRename(item: HomeManagementItem) { renameTarget.value = item; renameText.value = title(item) }
function rename() {
  const name = renameText.value.trim()
  if (!renameTarget.value || !name) return
  draft.value.titles = { ...draft.value.titles, [renameTarget.value.id]: name }
  emit('rename', renameTarget.value.id, name)
  renameTarget.value = undefined
}
watch(() => props.items, items => { draft.value.order = mergeHomeOrder(draft.value.order, items) })
</script>

<template>
  <div class="home-management" data-testid="unified-home-management">
    <header>
      <button class="circle" :aria-label="path.length ? t('unified.back') : t('common.close')" @click="path.length ? path.pop() : emit('close')"><ChevronLeft v-if="path.length" :size="20" /><X v-else :size="18" /></button>
      <h2>{{ editing ? currentTitle : t('nav.home') }}</h2>
      <button v-if="editing" class="circle confirm" :aria-label="t('common.save')" @click="save"><Check :size="22" /></button>
      <button v-else class="edit" @click="editing = true">{{ t('unified.edit') }}</button>
    </header>
    <div class="management-scroll">
      <template v-if="!editing">
        <div v-for="item in visible" :key="item.id" class="management-row" draggable="true" @dragstart="dragged = item.id; $event.dataTransfer?.setData('text/plain', item.id)" @dragover.prevent @drop.prevent="move(dragged, item.id)">
          <strong>{{ homeMenuTitle(item, draft) }}</strong><button class="icon" :aria-label="t('unified.reorder', { name: title(item) })" @keydown.up.prevent="moveBy(item.id, -1)" @keydown.down.prevent="moveBy(item.id, 1)"><GripHorizontal :size="20" /></button>
        </div>
      </template>
      <template v-else>
        <template v-for="group in path.length ? [{ id: 'current', title: '', nodes: currentNodes }] : [{ id: 'display', title: t('unified.displayItems'), nodes: displayNodes }, ...groups]" :key="group.id">
          <h3 v-if="group.title">{{ group.title }}</h3>
          <div v-for="node in group.nodes" :key="node.id" class="management-row">
            <button v-if="node.children?.length" class="node-title" @click="path.push(node)">{{ node.item ? group.id === 'display' ? homeMenuTitle(node.item, draft) : title(node.item) : node.title }}</button><strong v-else>{{ node.item ? group.id === 'display' ? homeMenuTitle(node.item, draft) : title(node.item) : node.title }}</strong>
            <button v-if="node.children?.length" class="icon" :aria-label="t('common.open')" @click="path.push(node)"><ChevronRight :size="17" /></button>
            <button v-if="node.item && node.id !== 'sources'" class="icon" :aria-label="t('file.rename')" @click="beginRename(node.item)"><Pencil :size="17" /></button>
            <button v-if="node.item" class="visibility" :class="{ hidden: draft.hidden.includes(node.id) }" :aria-label="t(draft.hidden.includes(node.id) ? 'unified.showItem' : 'unified.hideItem', { name: title(node.item) })" @click="toggle(node.item)"><Plus v-if="draft.hidden.includes(node.id)" :size="13" /><Minus v-else :size="13" /></button>
          </div>
        </template>
      </template>
    </div>
    <button v-if="!editing" class="reset" @click="emit('reset'); emit('close')">{{ t('unified.restoreOrder') }}</button>
    <a-modal :visible="!!renameTarget" :title="t('file.rename')" :ok-button-props="{ disabled: !renameText.trim() }" @ok="rename" @cancel="renameTarget = undefined"><a-input v-model="renameText" :aria-label="t('file.rename')" @press-enter="rename" /></a-modal>
  </div>
</template>

<style scoped>
.home-management{height:min(720px,80vh);display:flex;flex-direction:column;color:var(--color-text-1)}header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;gap:12px}h2{font-size:15px;margin:0;text-align:center;flex:1}button{font:inherit;color:inherit;cursor:pointer}.circle,.edit{border:1px solid var(--color-border-2);background:var(--color-fill-2);height:36px;display:grid;place-items:center;border-radius:50%;min-width:36px}.edit{border-radius:20px;padding:0 16px}.confirm{background:#ff8b25;color:white;border:0}.management-scroll{flex:1;overflow:auto;padding:8px 68px 20px}.management-row{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 16px;margin:10px 0;background:var(--color-fill-3);border-radius:10px}.management-row strong,.node-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-weight:600;font-size:13px}.node-title,.icon{border:0;background:transparent;padding:4px}.icon{display:grid;place-items:center;color:var(--color-text-3)}.visibility{width:17px;height:17px;display:grid;place-items:center;border:0;border-radius:50%;background:#ff4848;color:white;padding:0;flex-shrink:0}.visibility.hidden{background:#30c653}h3{font-size:13px;color:var(--color-text-3);margin:18px 16px 6px}.reset{margin:0 68px 20px;border:0;background:var(--color-fill-3);border-radius:10px;padding:10px}button:focus-visible{outline:2px solid #ff8b25;outline-offset:3px}.management-row[draggable]{cursor:grab}@media(max-width:700px){.management-scroll{padding:8px 20px}.reset{margin:0 20px 20px}}
</style>
