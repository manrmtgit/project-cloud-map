<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Activités</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="activities-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Statistiques -->
      <div class="stats-section">
        <h2 class="section-title">📊 Statistiques</h2>

        <div class="stats-grid">
          <StatsCard
            :icon="alertCircleIcon"
            :value="stats?.total || 0"
            label="Total signalements"
            icon-color="#6B4FFF"
            icon-bg-color="rgba(107, 79, 255, 0.1)"
          />

          <StatsCard
            :icon="checkmarkCircleIcon"
            :value="stats?.avancement_pourcentage || 0"
            label="Avancement"
            type="percentage"
            icon-color="#10B981"
            icon-bg-color="rgba(16, 185, 129, 0.1)"
          />

          <StatsCard
            :icon="resizeIcon"
            :value="stats?.surface_totale || 0"
            label="Surface totale"
            type="surface"
            icon-color="#F59E0B"
            icon-bg-color="rgba(245, 158, 11, 0.1)"
          />

          <StatsCard
            :icon="walletIcon"
            :value="stats?.budget_total || 0"
            label="Budget total"
            type="currency"
            icon-color="#EF4444"
            icon-bg-color="rgba(239, 68, 68, 0.1)"
          />
        </div>
      </div>

      <!-- Graphique par statut -->
      <div class="chart-section">
        <h2 class="section-title">📈 Répartition par statut</h2>
        <div class="chart-container">
          <Doughnut :data="chartData" :options="chartOptions" />
        </div>
        <div class="chart-legend">
          <div class="legend-item" v-for="status in statusLegend" :key="status.label">
            <span class="legend-color" :style="{ backgroundColor: status.color }"></span>
            <span class="legend-label">{{ status.label }}</span>
            <span class="legend-value">{{ status.value }}</span>
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filter-section">
        <ion-segment v-model="filter" @ionChange="onFilterChange">
          <ion-segment-button value="all">
            <ion-label>Tous</ion-label>
          </ion-segment-button>
          <ion-segment-button value="mine">
            <ion-label>Mes signalements</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- Liste des signalements récents -->
      <div class="list-section">
        <h2 class="section-title">📋 Signalements récents</h2>

        <div v-if="loading" class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <div v-else-if="filteredSignalements.length === 0" class="empty-state">
          <ion-icon :icon="documentTextOutline"></ion-icon>
          <p>Aucun signalement</p>
        </div>

        <div v-else class="signalements-list">
          <SignalementCard
            v-for="signalement in filteredSignalements"
            :key="signalement.id"
            :signalement="signalement"
            @click="goToSignalement"
          />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
  IonIcon
} from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  resizeOutline,
  walletOutline,
  documentTextOutline
} from 'ionicons/icons';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useSignalementsStore } from '@/stores';
import type { Signalement } from '@/models';
import StatsCard from '@/components/StatsCard.vue';
import SignalementCard from '@/components/SignalementCard.vue';

ChartJS.register(ArcElement, Tooltip, Legend);

const router = useRouter();
const signalementsStore = useSignalementsStore();

const filter = ref('all');
const loading = computed(() => signalementsStore.loading);
const stats = computed(() => signalementsStore.computedStats);

const alertCircleIcon = alertCircleOutline;
const checkmarkCircleIcon = checkmarkCircleOutline;
const resizeIcon = resizeOutline;
const walletIcon = walletOutline;

const filteredSignalements = computed(() => {
  if (filter.value === 'mine') {
    return signalementsStore.mySignalements.slice(0, 10);
  }
  return signalementsStore.signalements.slice(0, 10);
});

// Données du graphique
const chartData = computed(() => ({
  labels: ['Nouveau', 'En cours', 'Terminé'],
  datasets: [{
    data: [
      stats.value?.nouveau || 0,
      stats.value?.en_cours || 0,
      stats.value?.termine || 0
    ],
    backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
    borderWidth: 0
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  cutout: '70%'
};

const statusLegend = computed(() => [
  { label: 'Nouveau', color: '#EF4444', value: stats.value?.nouveau || 0 },
  { label: 'En cours', color: '#F59E0B', value: stats.value?.en_cours || 0 },
  { label: 'Terminé', color: '#10B981', value: stats.value?.termine || 0 }
]);

const onFilterChange = (event: CustomEvent) => {
  filter.value = event.detail.value;
};

const handleRefresh = async (event: CustomEvent) => {
  // La mise à jour est automatique via Firebase
  setTimeout(() => {
    (event.target as HTMLIonRefresherElement).complete();
  }, 1000);
};

const goToSignalement = (signalement: Signalement) => {
  // Naviguer vers la carte centrée sur ce signalement
  router.push({
    path: '/tabs/map',
    query: { lat: signalement.latitude, lng: signalement.longitude }
  });
};
</script>

<style scoped>
.activities-content {
  --background: #F9FAFB;
}

ion-toolbar {
  --background: white;
}

ion-title {
  font-weight: 700;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.stats-section {
  padding: 20px 16px;
  background: white;
  margin-bottom: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.chart-section {
  padding: 20px 16px;
  background: white;
  margin-bottom: 8px;
}

.chart-container {
  height: 180px;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-label {
  color: #6B7280;
}

.legend-value {
  font-weight: 600;
  color: #111827;
}

.filter-section {
  padding: 12px 16px;
  background: white;
  margin-bottom: 8px;
}

ion-segment {
  --background: #F3F4F6;
}

ion-segment-button {
  --indicator-color: #6B4FFF;
  --color-checked: #6B4FFF;
}

.list-section {
  padding: 20px 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #9CA3AF;
}

.empty-state ion-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.signalements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
