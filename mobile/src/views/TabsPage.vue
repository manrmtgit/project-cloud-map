<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="map" href="/tabs/map">
          <ion-icon :icon="mapOutline"></ion-icon>
          <ion-label>Carte</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="activities" href="/tabs/activities">
          <ion-icon :icon="barChartOutline"></ion-icon>
          <ion-label>Activités</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="personOutline"></ion-icon>
          <ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonPage, IonRouterOutlet, IonIcon } from '@ionic/vue';
import { mapOutline, barChartOutline, personOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-bar {
  --background: white;
  --border: none;
  height: 64px;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.06);
}

ion-tab-button {
  --color: #9CA3AF;
  --color-selected: #6B4FFF;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

ion-tab-button ion-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

ion-tab-button ion-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
</style>

