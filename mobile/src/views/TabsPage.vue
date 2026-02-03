<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="map" href="/tabs/map">
          <ion-icon aria-hidden="true" :icon="mapOutline" />
          <ion-label>Carte</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="activities" href="/tabs/activities">
          <ion-icon aria-hidden="true" :icon="statsChartOutline" />
          <ion-label>Activités</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon aria-hidden="true" :icon="personOutline" />
          <ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { mapOutline, statsChartOutline, personOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-bar {
  --background: white;
  --border: 1px solid #E5E7EB;
  height: 60px;
  padding-bottom: env(safe-area-inset-bottom);
}

ion-tab-button {
  --color: #9CA3AF;
  --color-selected: #6B4FFF;
}

ion-tab-button ion-icon {
  font-size: 24px;
}

ion-tab-button ion-label {
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}
</style>

