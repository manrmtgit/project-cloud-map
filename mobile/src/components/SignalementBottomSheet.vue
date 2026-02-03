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

        <!-- Photos multiples -->
        <div v-if="hasPhotos" class="signalement-photos">
          <div class="photos-scroll">
            <img
              v-for="(photo, index) in allPhotos"
              :key="index"
              :src="photo"
              :alt="`Photo ${index + 1}`"
              @click="openPhoto(photo)"
            />
          </div>
          <span class="photos-count" v-if="allPhotos.length > 1">{{ allPhotos.length }} photos</span>
        </div>

        <!-- Détails -->
        <div class="signalement-details">
          <div class="detail-item">
            <ion-icon :icon="calendarOutline"></ion-icon>
            <span class="detail-text">{{ formatDate(signalement.date_creation) }}</span>
          </div>

          <div class="detail-item">
            <ion-icon :icon="locationOutline"></ion-icon>
            <span class="detail-text">{{ typeLabel }}</span>
          </div>

          <div v-if="signalement.surface_m2" class="detail-item">
            <ion-icon :icon="resizeOutline"></ion-icon>
            <span class="detail-text">{{ formatSurface(signalement.surface_m2) }}</span>
          </div>

          <div v-if="signalement.budget" class="detail-item">
            <ion-icon :icon="walletOutline"></ion-icon>
            <span class="detail-text">{{ formatCurrency(signalement.budget) }}</span>
          </div>

          <div v-if="signalement.entreprise" class="detail-item">
            <ion-icon :icon="businessOutline"></ion-icon>
            <span class="detail-text">{{ signalement.entreprise }}</span>
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

// Combiner photo_url et photos[] pour avoir toutes les photos
const allPhotos = computed(() => {
  if (!props.signalement) return [];
  const photos: string[] = [];

  // Ajouter les photos du tableau photos[]
  if (props.signalement.photos && props.signalement.photos.length > 0) {
    photos.push(...props.signalement.photos);
  } else if (props.signalement.photo_url) {
    // Si pas de photos[], utiliser photo_url
    photos.push(props.signalement.photo_url);
  }

  return photos;
});

const hasPhotos = computed(() => allPhotos.value.length > 0);

const openPhoto = (photoUrl: string) => {
  // Ouvrir la photo en plein écran (on peut utiliser un modal ou window.open)
  window.open(photoUrl, '_blank');
};

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
  color: #000000;
  margin: 0;
}

.signalement-description {
  font-size: 14px;
  color: #374151;
  margin: 0;
  line-height: 1.5;
}

.signalement-photos {
  position: relative;
  margin: 8px 0;
}

.photos-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.photos-scroll::-webkit-scrollbar {
  height: 4px;
}

.photos-scroll::-webkit-scrollbar-track {
  background: #F3F4F6;
  border-radius: 2px;
}

.photos-scroll::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 2px;
}

.photos-scroll img {
  width: 150px;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.photos-scroll img:active {
  transform: scale(0.95);
}

.photos-count {
  position: absolute;
  bottom: 16px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
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
}

.detail-item ion-icon {
  font-size: 18px;
  color: #6B4FFF;
}

.detail-text {
  color: #000000;
  font-weight: 500;
}

.signalement-coords {
  font-size: 12px;
  color: #4B5563;
  text-align: center;
  padding: 8px;
  background: #F3F4F6;
  border-radius: 8px;
}
</style>
