<template>
  <ion-modal
      :is-open="isOpen"
      @didDismiss="handleDismiss"
      class="create-modal"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleDismiss">Annuler</ion-button>
        </ion-buttons>
        <ion-title>Nouveau signalement</ion-title>
        <ion-buttons slot="end">
          <ion-button
              :disabled="!isFormValid || loading"
              strong
              @click="handleSubmit"
          >
            <span v-if="loading">...</span>
            <span v-else>Créer</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Localisation -->
      <div class="location-preview" v-if="location">
        <ion-icon :icon="locationOutline"></ion-icon>
        <span>{{ location.lat.toFixed(6) }}, {{ location.lng.toFixed(6) }}</span>
      </div>

      <!-- Formulaire -->
      <div class="form-group">
        <ion-label>Titre *</ion-label>
        <ion-input
            v-model="form.titre"
            placeholder="Ex: Nid de poule rue..."
            :class="{ 'input-error': errors.titre }"
        ></ion-input>
        <span v-if="errors.titre" class="error-text">{{ errors.titre }}</span>
      </div>

      <div class="form-group">
        <ion-label>Type de problème *</ion-label>
        <ion-select
            v-model="form.type"
            placeholder="Sélectionner un type"
            interface="action-sheet"
        >
          <ion-select-option
              v-for="type in SIGNALEMENT_TYPES"
              :key="type.value"
              :value="type.value"
          >
            {{ type.icon }} {{ type.label }}
          </ion-select-option>
        </ion-select>
      </div>

      <div class="form-group">
        <ion-label>Description *</ion-label>
        <ion-textarea
            v-model="form.description"
            placeholder="Décrivez le problème en détail..."
            :rows="4"
            :class="{ 'input-error': errors.description }"
        ></ion-textarea>
        <span v-if="errors.description" class="error-text">{{ errors.description }}</span>
      </div>

      <!-- Photo -->
      <div class="form-group">
        <ion-label>Photo (optionnel)</ion-label>
        <div class="photo-section">
          <div v-if="photoPreview" class="photo-preview">
            <img :src="photoPreview" alt="Photo"/>
            <ion-button fill="clear" size="small" @click="removePhoto">
              <ion-icon :icon="closeCircleOutline"></ion-icon>
            </ion-button>
          </div>
          <div v-else class="photo-buttons">
            <ion-button expand="block" fill="outline" @click="takePhoto">
              <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
              Prendre une photo
            </ion-button>
            <ion-button expand="block" fill="outline" @click="pickPhoto">
              <ion-icon slot="start" :icon="imagesOutline"></ion-icon>
              Choisir une image
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonIcon
} from '@ionic/vue';
import {
  locationOutline,
  cameraOutline,
  imagesOutline,
  closeCircleOutline
} from 'ionicons/icons';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';
import {SIGNALEMENT_TYPES, type SignalementType, type CreateSignalementData} from '@/models';
import {isValidTitle, isValidDescription, ValidationMessages} from '@/utils/validators';

interface Props {
  isOpen: boolean;
  location: { lat: number; lng: number } | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'submit']);

const loading = ref(false);
const photoPreview = ref<string | null>(null);
const photoBlob = ref<Blob | null>(null);

const form = ref({
  titre: '',
  type: 'nid_de_poule' as SignalementType,
  description: ''
});

const errors = ref({
  titre: '',
  description: ''
});

// Validation du formulaire
const isFormValid = computed(() => {
  return (
      isValidTitle(form.value.titre) &&
      form.value.type &&
      isValidDescription(form.value.description) &&
      props.location !== null
  );
});

// Reset form when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    form.value = {
      titre: '',
      type: 'nid_de_poule',
      description: ''
    };
    errors.value = {titre: '', description: ''};
    photoPreview.value = null;
    photoBlob.value = null;
  }
});

// Validation en temps réel
watch(() => form.value.titre, (val) => {
  if (val && !isValidTitle(val)) {
    errors.value.titre = val.length < 3
        ? ValidationMessages.title.minLength
        : ValidationMessages.title.maxLength;
  } else {
    errors.value.titre = '';
  }
});

watch(() => form.value.description, (val) => {
  if (val && !isValidDescription(val)) {
    errors.value.description = val.length < 10
        ? ValidationMessages.description.minLength
        : ValidationMessages.description.maxLength;
  } else {
    errors.value.description = '';
  }
});

// Prendre une photo
const takePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    if (image.dataUrl) {
      photoPreview.value = image.dataUrl;
      // Convertir en Blob pour l'upload
      const response = await fetch(image.dataUrl);
      photoBlob.value = await response.blob();
    }
  } catch (error) {
    console.error('Erreur lors de la prise de photo:', error);
  }
};

// Choisir une image de la galerie
const pickPhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    if (image.dataUrl) {
      photoPreview.value = image.dataUrl;
      const response = await fetch(image.dataUrl);
      photoBlob.value = await response.blob();
    }
  } catch (error) {
    console.error('Erreur lors de la sélection de photo:', error);
  }
};

// Supprimer la photo
const removePhoto = () => {
  photoPreview.value = null;
  photoBlob.value = null;
};

// Fermer le modal
const handleDismiss = () => {
  emit('close');
};

// Soumettre le formulaire
const handleSubmit = () => {
  if (!isFormValid.value || !props.location) return;

  const data: CreateSignalementData & { photoBlob?: Blob } = {
    titre: form.value.titre.trim(),
    type: form.value.type,
    description: form.value.description.trim(),
    latitude: props.location.lat,
    longitude: props.location.lng
  };

  if (photoBlob.value) {
    data.photoBlob = photoBlob.value;
  }

  emit('submit', data);
};
</script>

<style scoped>
.create-modal {
  --height: 100%;
}

ion-toolbar {
  --background: white;
  --border-color: #E5E7EB;
}

ion-title {
  font-size: 17px;
  font-weight: 600;
}

ion-buttons ion-button {
  color: #6B4FFF;
  font-weight: 500;
}

.location-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #F3F4F6;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #374151;
}

.location-preview ion-icon {
  color: #6B4FFF;
  font-size: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group ion-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

ion-input, ion-textarea, ion-select {
  --color: #111827;
  --placeholder-color: #9CA3AF;
  --placeholder-opacity: 1;
  --background: #F9FAFB;
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}

ion-input:focus-within, ion-textarea:focus-within {
  border-color: #6B4FFF;
}

.input-error {
  border-color: #EF4444 !important;
}

.error-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #EF4444;
}

.photo-section {
  margin-top: 8px;
}

.photo-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.photo-preview ion-button {
  position: absolute;
  top: 8px;
  right: 8px;
  --color: white;
  --background: rgba(0, 0, 0, 0.5);
  --border-radius: 50%;
}

.photo-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.photo-buttons ion-button {
  --color: #6B4FFF;
  --border-color: #6B4FFF;
  --border-radius: 12px;
}
</style>
