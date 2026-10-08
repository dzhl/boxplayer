<script setup lang="ts">
import { Film } from 'lucide-vue-next'
</script>
<template><Film class="media-poster-placeholder-icon" :stroke-width="2" aria-hidden="true" /></template>
<style>
.media-poster-placeholder-icon { width: 36%; max-width: 80px; height: auto; aspect-ratio: 1; color: #ff8700; flex-shrink: 0; }
.media-card-placeholder:has(> .media-poster-placeholder-icon)::before { display: none !important; }
</style>
