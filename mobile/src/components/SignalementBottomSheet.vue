<template>
  <ion-modal
    :is-open="isOpen"
    :initial-breakpoint="0.5"
    :breakpoints="[0, 0.5, 0.75]"
    @didDismiss="handleDismiss"
    class="bottom-sheet"
  >
    <div class="bottom-sheet__content">
      <!-- Handle -->
      <div class="bottom-sheet__handle"></div>

      <!-- Header -->
      <div class="bottom-sheet__header">
        <div class="status-badge" :style="{ backgroundColor: statusColor }">
          <span class="status-icon">{{ statusIcon }}</span>
          <span class="status-label">{{ statusLabel }}</span>
        </div>
        <ion-button fill="clear" size="small" @click="handleDismiss">
          <ion-icon :icon="closeOutline"></ion-icon>
        </ion-button>
      </div>

      <!-- Info du signalement -->
      <div v-if="signalement" class="signalement-info">
        <h2 class="signalement-title">{{ signalement.titre }}</h2>
        <p class="signalement-description">{{ signalement.description }}</p>

        <!-- Photo -->
        <div v-if="signalement.photo_url" class="signalement-photo">
          <img :src="signalement.photo_url" :alt="signalement.titre" />
        </div>

        <!-- Détails -->
        <div class="signalement-details">
          <div class="detail-item">
            <ion-icon :icon="calendarOutline"></ion-icon>
            <span>{{ formatDate(signalement.date_creation) }}</span>
          </div>

          <div class="detail-item">
            <ion-icon :icon="locationOutline"></ion-icon>
            <span>{{ typeLabel }}</span>
          </div>

          <div v-if="signalement.surface_m2" class="detail-item">
            <ion-icon :icon="resizeOutline"></ion-icon>
            <span>{{ formatSurface(signalement.surface_m2) }}</span>
          </div>

          <div v-if="signalement.budget" class="detail-item">
            <ion-icon :icon="walletOutline"></ion-icon>
            <span>{{ formatCurrency(signalement.budget) }}</span>
          </div>

          <div v-if="signalement.entreprise" class="detail-item">
            <ion-icon :icon="businessOutline"></ion-icon>
            <span>{{ signalement.entreprise }}</span>
          </div>
        </div>

        <!-- Coordonnées -->
        <div class="signalement-coords">
          <span>📍 {{ signalement.latitude.toFixed(6) }}, {{ signalement.longitude.toFixed(6) }}</span>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonModal, IonButton, IonIcon } from '@ionic/vue';
import {
  closeOutline,
  calendarOutline,
  locationOutline,
  resizeOutline,
  walletOutline,
  businessOutline
} from 'ionicons/icons';
import type { Signalement } from '@/models';
import { getStatusColor, getStatusIcon, getTypeLabel, SIGNALEMENT_STATUS } from '@/models';
import { formatDate, formatCurrency, formatSurface } from '@/utils/formatters';

interface Props {
  isOpen: boolean;
  signalement: Signalement | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

const statusColor = computed(() => {
  if (!props.signalement) return '#6b7280';
  return getStatusColor(props.signalement.statut);
});

const statusIcon = computed(() => {
  if (!props.signalement) return '❓';
  return getStatusIcon(props.signalement.statut);
});

const statusLabel = computed(() => {
  if (!props.signalement) return '';
  const status = SIGNALEMENT_STATUS.find(s => s.value === props.signalement?.statut);
  return status?.label || props.signalement.statut;
});

const typeLabel = computed(() => {
  if (!props.signalement) return '';
  return getTypeLabel(props.signalement.type);
});

const handleDismiss = () => {
  emit('close');
};
</script>

<style scoped>
.bottom-sheet {
  --height: auto;
  --border-radius: 24px 24px 0 0;
  --background: white;
}

.bottom-sheet__content {
  padding: 12px 20px 32px;
}

.bottom-sheet__handle {
  width: 40px;
  height: 4px;
  background: #E5E7EB;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.bottom-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.status-icon {
  font-size: 14px;
}

.signalement-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signalement-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.signalement-description {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
  line-height: 1.5;
}

.signalement-photo {
  border-radius: 12px;
  overflow: hidden;
  margin: 8px 0;
}

.signalement-photo img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.signalement-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.detail-item ion-icon {
  font-size: 18px;
  color: #6B4FFF;
}

.signalement-coords {
  font-size: 12px;
  color: #9CA3AF;
  text-align: center;
  padding: 8px;
  background: #F3F4F6;
  border-radius: 8px;
}
</style>
