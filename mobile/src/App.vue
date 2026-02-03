<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

// Initialiser le store d'authentification au démarrage
onMounted(() => {
  authStore.initialize();
});
</script>
