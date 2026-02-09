<template>
  <div class="signalement-card" @click="$emit('click', signalement)">
    <div class="card-status" :style="{ backgroundColor: statusColor }">
      <ion-icon :icon="statusIcon" style="color: white; font-size: 20px;"></ion-icon>
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ signalement.titre }}</h3>
      <p class="card-description">{{ truncatedDescription }}</p>
      <div class="card-meta">
        <span class="card-type"><ion-icon :icon="typeIcon" style="vertical-align: middle; margin-right: 4px;"></ion-icon>{{ typeLabel }}</span>
        <span class="card-date">{{ formattedDate }}</span>
      </div>
    </div>
    <ion-icon :icon="chevronForwardOutline" class="card-arrow"></ion-icon>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import type { Signalement } from '@/models';
import { getStatusColor, getStatusIcon, getTypeLabel, SIGNALEMENT_TYPES } from '@/models';
import { formatRelativeDate, truncateText } from '@/utils/formatters';
import { chevronForwardOutline, helpCircleOutline } from 'ionicons/icons';

interface Props {
  signalement: Signalement;
}

const props = defineProps<Props>();
defineEmits(['click']);

const statusColor = computed(() => getStatusColor(props.signalement.statut));
const statusIcon = computed(() => getStatusIcon(props.signalement.statut));

const typeLabel = computed(() => getTypeLabel(props.signalement.type));
const typeIcon = computed(() => {
  const type = SIGNALEMENT_TYPES.find(t => t.value === props.signalement.type);
  return type?.icon || helpCircleOutline;
});

const truncatedDescription = computed(() =>
  truncateText(props.signalement.description, 80)
);

const formattedDate = computed(() =>
  formatRelativeDate(props.signalement.date_creation)
);
</script>

<style scoped>
.signalement-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.signalement-card:active {
  transform: scale(0.97);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.card-status {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-description {
  font-size: 13px;
  color: #374151;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.card-type {
  color: #6B4FFF;
  font-weight: 500;
}

.card-date {
  color: #6B7280;
}

.card-arrow {
  color: #D1D5DB;
  font-size: 20px;
  flex-shrink: 0;
}
</style>
