<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="handleDismiss"
    class="photo-viewer-modal"
  >
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button @click="handleDismiss" color="light">
            <ion-icon :icon="closeOutline" style="font-size: 24px;"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ currentIndex + 1 }} / {{ photos.length }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="downloadPhoto" color="light" v-if="currentPhoto">
            <ion-icon :icon="downloadOutline" style="font-size: 22px;"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="photo-viewer-content" :scroll-y="false">
      <!-- Zone de la photo principale -->
      <div
        class="photo-container"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="photo-wrapper" :style="photoStyle">
          <img
            v-if="currentPhoto"
            :src="currentPhoto"
            :alt="`Photo ${currentIndex + 1}`"
            class="full-photo"
            @load="onImageLoad"
            @error="onImageError"
          />
          <div v-else class="photo-placeholder">
            <ion-icon :icon="imageOutline" style="font-size: 64px; color: #6B7280;"></ion-icon>
            <p>Image non disponible</p>
          </div>
        </div>

        <!-- Flèche gauche -->
        <button
          v-if="photos.length > 1 && currentIndex > 0"
          class="nav-btn nav-btn--left"
          @click="prevPhoto"
        >
          <ion-icon :icon="chevronBackOutline"></ion-icon>
        </button>

        <!-- Flèche droite -->
        <button
          v-if="photos.length > 1 && currentIndex < photos.length - 1"
          class="nav-btn nav-btn--right"
          @click="nextPhoto"
        >
          <ion-icon :icon="chevronForwardOutline"></ion-icon>
        </button>
      </div>

      <!-- Indicateurs (dots) -->
      <div v-if="photos.length > 1" class="photo-dots">
        <span
          v-for="(_, index) in photos"
          :key="index"
          class="dot"
          :class="{ 'dot--active': index === currentIndex }"
          @click="goToPhoto(index)"
        ></span>
      </div>

      <!-- Miniatures -->
      <div v-if="photos.length > 1" class="thumbnails-strip">
        <div class="thumbnails-scroll">
          <img
            v-for="(photo, index) in photos"
            :key="index"
            :src="photo"
            :alt="`Miniature ${index + 1}`"
            class="thumbnail"
            :class="{ 'thumbnail--active': index === currentIndex }"
            @click="goToPhoto(index)"
          />
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon
} from '@ionic/vue';
import {
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  downloadOutline,
  imageOutline
} from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  photos: string[];
  initialIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0
});
const emit = defineEmits(['close']);

const currentIndex = ref(0);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

// Touch tracking
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

const currentPhoto = computed(() => {
  if (props.photos.length === 0) return null;
  return props.photos[currentIndex.value] || null;
});

const photoStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px)`,
  transition: isSwiping ? 'none' : 'transform 0.3s ease'
}));

// Reset index when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentIndex.value = props.initialIndex;
    resetTransform();
  }
});

const resetTransform = () => {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
};

const prevPhoto = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetTransform();
  }
};

const nextPhoto = () => {
  if (currentIndex.value < props.photos.length - 1) {
    currentIndex.value++;
    resetTransform();
  }
};

const goToPhoto = (index: number) => {
  currentIndex.value = index;
  resetTransform();
};

// Touch handlers for swipe navigation
const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }
};

const onTouchMove = (e: TouchEvent) => {
  if (!isSwiping || e.touches.length !== 1) return;
  const deltaX = e.touches[0].clientX - touchStartX;
  translateX.value = deltaX * 0.3;
};

const onTouchEnd = (e: TouchEvent) => {
  if (!isSwiping) return;
  isSwiping = false;

  const deltaX = translateX.value / 0.3;
  const threshold = 80;

  if (deltaX < -threshold && currentIndex.value < props.photos.length - 1) {
    nextPhoto();
  } else if (deltaX > threshold && currentIndex.value > 0) {
    prevPhoto();
  } else {
    resetTransform();
  }
};

const onImageLoad = () => {
  // Image loaded successfully
};

const onImageError = () => {
  console.error('Erreur chargement image');
};

const downloadPhoto = () => {
  if (!currentPhoto.value) return;
  const link = document.createElement('a');
  link.href = currentPhoto.value;
  link.download = `photo-${currentIndex.value + 1}.jpg`;
  link.click();
};

const handleDismiss = () => {
  emit('close');
};
</script>

<style scoped>
.photo-viewer-modal {
  --height: 100%;
  --width: 100%;
  --background: #000000;
}

.photo-viewer-modal ion-toolbar {
  --background: rgba(0, 0, 0, 0.9);
  --color: white;
  --border-color: transparent;
}

.photo-viewer-content {
  --background: #000000;
}

.photo-container {
  position: relative;
  width: 100%;
  height: calc(100% - 100px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.photo-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.full-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6B7280;
}

.photo-placeholder p {
  font-size: 14px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.nav-btn:active {
  background: rgba(255, 255, 255, 0.4);
}

.nav-btn ion-icon {
  font-size: 24px;
}

.nav-btn--left {
  left: 12px;
}

.nav-btn--right {
  right: 12px;
}

.photo-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s;
}

.dot--active {
  background: white;
  transform: scale(1.3);
}

.thumbnails-strip {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
}

.thumbnails-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  justify-content: center;
  -webkit-overflow-scrolling: touch;
}

.thumbnails-scroll::-webkit-scrollbar {
  display: none;
}

.thumbnail {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s;
  flex-shrink: 0;
  border: 2px solid transparent;
}

.thumbnail--active {
  opacity: 1;
  border-color: #6B4FFF;
  transform: scale(1.05);
}

.thumbnail:active {
  opacity: 0.8;
}
</style>
