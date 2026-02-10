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
        <ion-icon :icon="locationOutline" style="color: #6B4FFF; font-size: 20px;"></ion-icon>
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

      <!-- Photos (multiples) -->
      <div class="form-group">
        <ion-label>Photos (optionnel - max 5)</ion-label>
        <div class="photo-section">
          <!-- Prévisualisation des photos -->
          <div v-if="photoPreviews.length > 0" class="photos-preview-grid">
            <div v-for="(photo, index) in photoPreviews" :key="index" class="photo-preview-item">
              <img :src="photo" alt="Photo"/>
              <ion-button fill="clear" size="small" @click="removePhoto(index)">
                <ion-icon :icon="closeCircleOutline"></ion-icon>
              </ion-button>
            </div>
            <!-- Bouton ajouter plus si moins de 5 photos -->
            <div v-if="photoPreviews.length < 5" class="add-photo-btn" @click="showPhotoOptions = true">
              <ion-icon :icon="addOutline" style="font-size: 24px; color: #6B4FFF;"></ion-icon>
            </div>
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

      <!-- Action Sheet pour ajouter plus de photos -->
      <ion-action-sheet
        :is-open="showPhotoOptions"
        header="Ajouter une photo"
        :buttons="photoActionButtons"
        @didDismiss="showPhotoOptions = false"
      ></ion-action-sheet>
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
  IonActionSheet,
  IonIcon
} from '@ionic/vue';
import {Camera, CameraResultType, CameraSource} from '@capacitor/camera';
import {SIGNALEMENT_TYPES, type SignalementType, type CreateSignalementData} from '@/models';
import {isValidTitle, isValidDescription, ValidationMessages} from '@/utils/validators';
import {
  cameraOutline,
  imagesOutline,
  locationOutline,
  closeCircleOutline,
  addOutline
} from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  location: { lat: number; lng: number } | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'submit']);

const loading = ref(false);
const photoPreviews = ref<string[]>([]);
const showPhotoOptions = ref(false);

const form = ref({
  titre: '',
  type: 'nid_de_poule' as SignalementType,
  description: ''
});

const errors = ref({
  titre: '',
  description: ''
});

// Boutons pour l'action sheet
const photoActionButtons = [
  {
    text: 'Prendre une photo',
    icon: cameraOutline,
    handler: () => {
      takePhoto();
    }
  },
  {
    text: 'Choisir une image',
    icon: imagesOutline,
    handler: () => {
      pickPhoto();
    }
  },
  {
    text: 'Annuler',
    role: 'cancel'
  }
];

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
    photoPreviews.value = [];
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
  if (photoPreviews.value.length >= 5) return;

  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    if (image.dataUrl) {
      photoPreviews.value.push(image.dataUrl);
    }
  } catch (error) {
    console.error('Erreur lors de la prise de photo:', error);
  }
};

// Choisir une image de la galerie
const pickPhoto = async () => {
  if (photoPreviews.value.length >= 5) return;

  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    if (image.dataUrl) {
      photoPreviews.value.push(image.dataUrl);
    }
  } catch (error) {
    console.error('Erreur lors de la sélection de photo:', error);
  }
};

// Supprimer une photo
const removePhoto = (index: number) => {
  photoPreviews.value.splice(index, 1);
};

// Fermer le modal
const handleDismiss = () => {
  emit('close');
};

// Soumettre le formulaire
const handleSubmit = () => {
  if (!isFormValid.value || !props.location) return;

  const data: CreateSignalementData & { photoDataUrls?: string[] } = {
    titre: form.value.titre.trim(),
    type: form.value.type,
    description: form.value.description.trim(),
    latitude: props.location.lat,
    longitude: props.location.lng
  };

  if (photoPreviews.value.length > 0) {
    data.photoDataUrls = photoPreviews.value;
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
  --color: #000000;
}

ion-title {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
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
  color: #000000;
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
  color: #000000;
}

ion-input, ion-textarea, ion-select {
  --color: #000000;
  --placeholder-color: #6B7280;
  --placeholder-opacity: 1;
  --background: #F9FAFB;
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  color: #000000;
}

ion-input::part(native), ion-textarea::part(native) {
  color: #000000 !important;
}

ion-select::part(text) {
  color: #000000 !important;
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

.photos-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.photo-preview-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1;
}

.photo-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-preview-item ion-button {
  position: absolute;
  top: 4px;
  right: 4px;
  --color: white;
  --background: rgba(0, 0, 0, 0.5);
  --border-radius: 50%;
  --padding-start: 4px;
  --padding-end: 4px;
  margin: 0;
  width: 28px;
  height: 28px;
}

.add-photo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #D1D5DB;
  border-radius: 12px;
  background: #F9FAFB;
  cursor: pointer;
  aspect-ratio: 1;
}

.add-photo-btn ion-icon {
  font-size: 24px;
  color: #6B4FFF;
}

.add-photo-btn:active {
  background: #E5E7EB;
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
