<template>
  <ion-modal
    :is-open="isOpen"
    :initial-breakpoint="0.45"
    :breakpoints="[0, 0.45, 0.7, 0.92]"
    @didDismiss="handleDismiss"
    class="bottom-sheet"
    handle-behavior="cycle"
  >
    <div class="sheet" v-if="signalement">
      <!-- Drag handle -->
      <div class="sheet__handle-bar"><div class="sheet__handle"></div></div>

      <!-- Scrollable content -->
      <div class="sheet__scroll">

        <!-- ===== HERO SECTION ===== -->
        <div class="hero">
          <!-- Status + Type row -->
          <div class="hero__badges">
            <span class="badge badge--status" :style="{ background: statusColor }">
              <ion-icon :icon="statusIcon" class="badge__icon"></ion-icon>
              {{ statusLabel }}
            </span>
            <span class="badge badge--type">
              <ion-icon :icon="typeIcon" class="badge__icon"></ion-icon>
              {{ typeLabel }}
            </span>
          </div>

          <h1 class="hero__title">{{ signalement.titre || 'Signalement' }}</h1>
          <p class="hero__description" v-if="signalement.description">{{ signalement.description }}</p>
          <p class="hero__meta">
            <ion-icon :icon="timeOutline"></ion-icon>
            {{ formatRelativeDate(signalement.date_creation) }}
            <template v-if="signalement.user_email">
              <span class="hero__sep">·</span>
              <ion-icon :icon="personOutline"></ion-icon>
              {{ signalement.user_email }}
            </template>
          </p>
        </div>

        <!-- ===== PROGRESS SECTION ===== -->
        <div class="progress-card">
          <div class="progress-card__header">
            <span class="progress-card__label">Avancement</span>
            <span class="progress-card__value" :style="{ color: statusColor }">{{ avancement }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: avancement + '%', background: progressGradient }"></div>
          </div>
          <div class="timeline">
            <div class="timeline__step" :class="{ 'timeline__step--done': isStepDone('nouveau'), 'timeline__step--active': signalement.statut === 'nouveau' }">
              <div class="timeline__dot"></div>
              <div class="timeline__info">
                <span class="timeline__label">Signalé</span>
                <span class="timeline__date" v-if="signalement.date_nouveau || signalement.date_creation">{{ formatDate(signalement.date_nouveau || signalement.date_creation) }}</span>
              </div>
            </div>
            <div class="timeline__line" :class="{ 'timeline__line--done': isStepDone('en_cours') }"></div>
            <div class="timeline__step" :class="{ 'timeline__step--done': isStepDone('en_cours'), 'timeline__step--active': signalement.statut === 'en_cours' }">
              <div class="timeline__dot"></div>
              <div class="timeline__info">
                <span class="timeline__label">En cours</span>
                <span class="timeline__date" v-if="signalement.date_en_cours">{{ formatDate(signalement.date_en_cours) }}</span>
                <span class="timeline__date timeline__date--pending" v-else>En attente</span>
              </div>
            </div>
            <div class="timeline__line" :class="{ 'timeline__line--done': isStepDone('termine') }"></div>
            <div class="timeline__step" :class="{ 'timeline__step--done': isStepDone('termine'), 'timeline__step--active': signalement.statut === 'termine' }">
              <div class="timeline__dot"></div>
              <div class="timeline__info">
                <span class="timeline__label">Terminé</span>
                <span class="timeline__date" v-if="signalement.date_termine">{{ formatDate(signalement.date_termine) }}</span>
                <span class="timeline__date timeline__date--pending" v-else>En attente</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== PHOTOS ===== -->
        <div class="section" v-if="hasPhotos">
          <div class="section__header">
            <ion-icon :icon="cameraOutline" class="section__icon"></ion-icon>
            <span class="section__title">Photos</span>
            <span class="section__count">{{ allPhotos.length }}</span>
          </div>
          <div class="photos-strip">
            <div
              v-for="(photo, index) in allPhotos"
              :key="index"
              class="photo-thumb"
              @click="openPhotoViewer(index)"
            >
              <img :src="photo" :alt="`Photo ${index + 1}`" loading="lazy" />
              <div class="photo-thumb__overlay">
                <ion-icon :icon="expandOutline"></ion-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== DETAILS GRID ===== -->
        <div class="section">
          <div class="section__header">
            <ion-icon :icon="informationCircleOutline" class="section__icon"></ion-icon>
            <span class="section__title">Détails</span>
          </div>
          <div class="details-grid">
            <div class="detail-card" v-if="signalement.surface_m2">
              <div class="detail-card__icon" style="background: #FEF3C7;"><ion-icon :icon="resizeOutline" style="color: #D97706;"></ion-icon></div>
              <div class="detail-card__body">
                <span class="detail-card__label">Surface</span>
                <span class="detail-card__value">{{ formatSurface(signalement.surface_m2) }}</span>
              </div>
            </div>
            <div class="detail-card" v-if="signalement.budget">
              <div class="detail-card__icon" style="background: #D1FAE5;"><ion-icon :icon="walletOutline" style="color: #059669;"></ion-icon></div>
              <div class="detail-card__body">
                <span class="detail-card__label">Budget</span>
                <span class="detail-card__value">{{ formatCurrency(signalement.budget) }}</span>
              </div>
            </div>
            <div class="detail-card" v-if="signalement.entreprise">
              <div class="detail-card__icon" style="background: #EDE9FE;"><ion-icon :icon="businessOutline" style="color: #7C3AED;"></ion-icon></div>
              <div class="detail-card__body">
                <span class="detail-card__label">Entreprise</span>
                <span class="detail-card__value">{{ signalement.entreprise }}</span>
              </div>
            </div>
            <div class="detail-card">
              <div class="detail-card__icon" style="background: #DBEAFE;"><ion-icon :icon="calendarOutline" style="color: #2563EB;"></ion-icon></div>
              <div class="detail-card__body">
                <span class="detail-card__label">Date de création</span>
                <span class="detail-card__value">{{ formatDate(signalement.date_creation) }}</span>
              </div>
            </div>
            <div class="detail-card" v-if="signalement.date_modification">
              <div class="detail-card__icon" style="background: #FCE7F3;"><ion-icon :icon="refreshOutline" style="color: #DB2777;"></ion-icon></div>
              <div class="detail-card__body">
                <span class="detail-card__label">Dernière mise à jour</span>
                <span class="detail-card__value">{{ formatDate(signalement.date_modification) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== LOCATION ===== -->
        <div class="section">
          <div class="section__header">
            <ion-icon :icon="locationOutline" class="section__icon"></ion-icon>
            <span class="section__title">Localisation</span>
          </div>
          <div class="location-card">
            <div class="location-card__coords">
              <span>{{ signalement.latitude?.toFixed(6) }}, {{ signalement.longitude?.toFixed(6) }}</span>
            </div>
            <ion-button fill="outline" size="small" class="location-card__btn" @click="openInMaps">
              <ion-icon :icon="navigateOutline" slot="start"></ion-icon>
              Itinéraire
            </ion-button>
          </div>
        </div>

        <!-- Bottom spacing -->
        <div style="height: 24px;"></div>
      </div>
    </div>

    <!-- Photo Viewer Modal -->
    <PhotoViewerModal
      :is-open="showPhotoViewer"
      :photos="allPhotos"
      :initial-index="photoViewerIndex"
      @close="showPhotoViewer = false"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonModal, IonButton, IonIcon } from '@ionic/vue';
import type { Signalement } from '@/models';
import { getStatusColor, getStatusIcon, getTypeLabel, SIGNALEMENT_STATUS, SIGNALEMENT_TYPES } from '@/models';
import { formatDate, formatRelativeDate, formatCurrency, formatSurface } from '@/utils/formatters';
import PhotoViewerModal from '@/components/PhotoViewerModal.vue';
import {
  closeOutline,
  calendarOutline,
  resizeOutline,
  walletOutline,
  businessOutline,
  timeOutline,
  locationOutline,
  expandOutline,
  cameraOutline,
  informationCircleOutline,
  navigateOutline,
  personOutline,
  refreshOutline
} from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  signalement: Signalement | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

const showPhotoViewer = ref(false);
const photoViewerIndex = ref(0);

// ---- Computed ----

const statusColor = computed(() => {
  if (!props.signalement) return '#94A3B8';
  return getStatusColor(props.signalement.statut);
});

const statusIcon = computed(() => {
  if (!props.signalement) return '';
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

const typeIcon = computed(() => {
  if (!props.signalement) return '';
  const t = SIGNALEMENT_TYPES.find(t => t.value === props.signalement?.type);
  return t?.icon || '';
});

const avancement = computed(() => {
  if (!props.signalement) return 0;
  if (props.signalement.avancement != null) return props.signalement.avancement;
  switch (props.signalement.statut) {
    case 'termine': return 100;
    case 'en_cours': return 50;
    default: return 0;
  }
});

const progressGradient = computed(() => {
  const pct = avancement.value;
  if (pct >= 100) return 'linear-gradient(90deg, #34D399, #10B981)';
  if (pct >= 50) return 'linear-gradient(90deg, #FBBF24, #F59E0B)';
  return 'linear-gradient(90deg, #F87171, #EF4444)';
});

const allPhotos = computed(() => {
  if (!props.signalement) return [];
  const photos: string[] = [];
  if (props.signalement.photos && props.signalement.photos.length > 0) {
    photos.push(...props.signalement.photos);
  } else if (props.signalement.photo_url) {
    photos.push(props.signalement.photo_url);
  }
  return photos;
});

const hasPhotos = computed(() => allPhotos.value.length > 0);

// ---- Methods ----

const isStepDone = (step: string) => {
  const order = ['nouveau', 'en_cours', 'termine'];
  const currentIdx = order.indexOf(props.signalement?.statut || 'nouveau');
  const stepIdx = order.indexOf(step);
  return stepIdx <= currentIdx;
};

const openPhotoViewer = (index: number) => {
  photoViewerIndex.value = index;
  showPhotoViewer.value = true;
};

const openInMaps = () => {
  if (!props.signalement) return;
  const { latitude, longitude } = props.signalement;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_system');
};

const handleDismiss = () => {
  emit('close');
};
</script>

<style scoped>
/* ===== MODAL SHELL ===== */
.bottom-sheet {
  --height: auto;
  --border-radius: 20px 20px 0 0;
  --background: #F8FAFC;
  --box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.12);
}

.sheet {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

.sheet__handle-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.sheet__handle {
  width: 36px;
  height: 4px;
  background: #CBD5E1;
  border-radius: 99px;
}

.sheet__scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 20px 0;
}

/* ===== HERO ===== */
.hero {
  padding-bottom: 16px;
  border-bottom: 1px solid #E2E8F0;
}

.hero__badges {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.badge__icon {
  font-size: 12px;
}

.badge--status {
  color: #fff;
}

.badge--type {
  background: #E2E8F0;
  color: #475569;
}

.hero__title {
  font-size: 20px;
  font-weight: 800;
  color: #0F172A;
  margin: 0 0 4px;
  line-height: 1.25;
}

.hero__description {
  font-size: 14px;
  color: #475569;
  margin: 0 0 8px;
  line-height: 1.55;
}

.hero__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #94A3B8;
  margin: 0;
}

.hero__meta ion-icon {
  font-size: 13px;
}

.hero__sep {
  margin: 0 2px;
}

/* ===== PROGRESS CARD ===== */
.progress-card {
  margin-top: 16px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #E2E8F0;
}

.progress-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.progress-card__value {
  font-size: 15px;
  font-weight: 800;
}

.progress-bar {
  height: 6px;
  background: #E2E8F0;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 14px;
}

.progress-bar__fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ===== TIMELINE ===== */
.timeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.timeline__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  min-width: 70px;
}

.timeline__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #CBD5E1;
  border: 2px solid #E2E8F0;
  transition: all 0.3s;
  margin-bottom: 6px;
}

.timeline__step--done .timeline__dot {
  background: #10B981;
  border-color: #D1FAE5;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.timeline__step--active .timeline__dot {
  background: #F59E0B;
  border-color: #FEF3C7;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.timeline__line {
  flex: 1;
  height: 2px;
  background: #E2E8F0;
  margin-top: 5px;
  min-width: 20px;
}

.timeline__line--done {
  background: #10B981;
}

.timeline__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.timeline__label {
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.timeline__date {
  font-size: 10px;
  color: #64748B;
  white-space: nowrap;
}

.timeline__date--pending {
  color: #CBD5E1;
  font-style: italic;
}

/* ===== SECTION GENERIC ===== */
.section {
  margin-top: 16px;
}

.section__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.section__icon {
  font-size: 16px;
  color: #6366F1;
}

.section__title {
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
}

.section__count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: #6366F1;
  background: #EEF2FF;
  padding: 2px 8px;
  border-radius: 10px;
}

/* ===== PHOTOS STRIP ===== */
.photos-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}

.photos-strip::-webkit-scrollbar {
  height: 0;
}

.photo-thumb {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  border-radius: 12px;
  overflow: hidden;
  scroll-snap-align: start;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.photo-thumb:active img {
  transform: scale(0.95);
}

.photo-thumb__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.photo-thumb__overlay ion-icon {
  font-size: 22px;
  color: white;
}

.photo-thumb:active .photo-thumb__overlay {
  opacity: 1;
}

/* ===== DETAILS GRID ===== */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
}

.detail-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-card__icon ion-icon {
  font-size: 18px;
}

.detail-card__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.detail-card__label {
  font-size: 10px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.detail-card__value {
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== LOCATION CARD ===== */
.location-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
}

.location-card__coords {
  font-size: 13px;
  color: #475569;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 500;
}

.location-card__btn {
  --border-radius: 10px;
  --border-color: #6366F1;
  --color: #6366F1;
  font-size: 12px;
  font-weight: 600;
  height: 34px;
}
</style>
