<script setup lang="ts">
import MediaPosterPlaceholder from './MediaPosterPlaceholder.vue'
import { Film } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted } from 'vue'
import WatchedIndicator from './WatchedIndicator.vue'
import MediaPosterMenu from './MediaPosterMenu.vue'
import type { UnifiedLibraryCard } from '../types/unifiedMediaLibrary'
import type { UnifiedLibraryRow } from '../types/unifiedMediaLibrary'
import { t } from '../i18n'

withDefaults(defineProps<{ row: UnifiedLibraryRow; mode?: 'horizontal' | 'grid' | 'list'; showMore?: boolean }>(), { mode: 'horizontal', showMore: true })
const menuCard = ref<UnifiedLibraryCard>()
const position = ref({ x: 0, y: 0 })
let clickTimer: ReturnType<typeof setTimeout> | undefined
function clickCard(card: UnifiedLibraryCard) { if (!card.posterMenu) { card.action(); return } clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickTimer = undefined; card.action() }, 300) }
function openMenu(event: MouseEvent, card: UnifiedLibraryCard) { if (!card.posterMenu) return; event.preventDefault(); clearTimeout(clickTimer); menuCard.value = card; position.value = { x: Math.max(8, Math.min(event.clientX, window.innerWidth - 205)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 350)) } }
function closeMenu() { menuCard.value = undefined }
function keyMenu(event: KeyboardEvent) { if (event.key === 'Escape') closeMenu() }
onMounted(() => { document.addEventListener('click', closeMenu); document.addEventListener('keydown', keyMenu) })
onUnmounted(() => { clearTimeout(clickTimer); document.removeEventListener('click', closeMenu); document.removeEventListener('keydown', keyMenu) })
const failedImages = ref(new Set<string>())
</script>

<template>
  <section class="home-row" :class="`mode-${mode}`">
    <div v-if="showMore" class="row-heading">
      <h2>{{ row.title }}</h2>
      <button @click="row.more">{{ t('mediaServer.seeAllPlain') }}</button>
    </div>
    <div class="horizontal-row">
      <button v-for="card in row.cards" :key="card.key" class="media-card" :class="{ landscape: row.landscape }" @click="clickCard(card)" @dblclick.stop="openMenu($event, card)" @contextmenu="openMenu($event, card)">
        <div class="artwork">
          <MediaPosterPlaceholder v-if="card.posterMenu" /><Film v-else :size="38" aria-hidden="true" />
          <img v-if="card.image && !failedImages.has(card.image)" :src="card.image" :alt="card.title" loading="lazy" @error="failedImages.add(card.image!)" />
          <WatchedIndicator v-if="card.posterMenu && row.key !== 'resume'" corner :watched="card.posterMenu.watched" />
          <progress v-if="card.progress" :aria-label="card.title" :value="card.progress" max="100" />
        </div>
        <strong :title="card.title">{{ card.title }}</strong>
        <small v-if="card.subtitle">{{ card.subtitle }}</small>
      </button>
    </div>
    <Teleport to="body"><div v-if="menuCard?.posterMenu" class="home-poster-popup" :style="{ left: position.x + 'px', top: position.y + 'px' }" @click.stop><MediaPosterMenu hide-select :server="menuCard.posterMenu.server" :tv="menuCard.posterMenu.tv" :watched="menuCard.posterMenu.watched" :favorite="menuCard.posterMenu.favorite" :disabled="menuCard.posterMenu.disabled" @action="action => { menuCard?.posterMenu?.action(action); closeMenu() }" /></div></Teleport>
  </section>
</template>

<style scoped>
.home-poster-popup{position:fixed;z-index:1100;border:1px solid var(--color-border-3);border-radius:12px;box-shadow:0 8px 24px #0003;overflow:hidden}
.home-row { margin-bottom: 34px; }
.row-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; }
h2 { font-size: 19px; font-weight: 600; margin: 0; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid #ff8b25; outline-offset: 2px; }
.row-heading button { flex-shrink: 0; border: 0; background: transparent; color: #ff8b25; font-size: 13px; }
.horizontal-row { display: flex; gap: 18px; overflow-x: auto; padding: 3px 3px 10px; }
.media-card { width: 160px; flex-shrink: 0; text-align: left; border: 0; background: transparent; padding: 0; }
.media-card.landscape { width: 280px; }
.artwork { height: 240px; position: relative; display: grid; place-items: center; border-radius: 14px; overflow: hidden; background: var(--color-fill-2); color: var(--color-text-4); }
.landscape .artwork { height: 158px; }
.artwork img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.artwork progress { position: absolute; bottom: 0; width: 100%; height: 4px; accent-color: #ff8b25; }
.media-card strong, .media-card small { display: block; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.media-card small { color: var(--color-text-3); font-size: 12px; }
@media (max-width: 1050px) { .media-card { width: 140px; } .artwork { height: 210px; } }
.mode-grid .horizontal-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 24px 18px; overflow: visible; }
.mode-grid .media-card { width: 100%; }
.mode-grid .artwork { height: auto; aspect-ratio: 2 / 3; }
.mode-grid .landscape .artwork { aspect-ratio: 16 / 9; }
.mode-list .horizontal-row { flex-direction: column; gap: 0; overflow: visible; }
.mode-list .media-card { width: 100%; display: grid; grid-template-columns: 160px minmax(0, 1fr); grid-template-rows: auto auto; align-items: center; gap: 8px 18px; padding: 16px 0; border-bottom: 1px solid var(--color-border-2); }
.mode-list .artwork { grid-row: 1 / 3; width: 160px; height: 90px; }
.mode-list strong { align-self: end; }
.mode-list small { align-self: start; }
@media (max-width: 1100px) { .mode-grid .horizontal-row { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 800px) { .mode-grid .horizontal-row { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
