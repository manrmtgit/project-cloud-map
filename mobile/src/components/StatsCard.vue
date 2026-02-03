<template>
  <div class="stats-card" :class="{ 'stats-card--highlight': highlight }">
    <div class="stats-card__icon" :style="{ backgroundColor: iconBgColor }">
      <ion-icon :icon="icon" :style="{ color: iconColor }"></ion-icon>
    </div>
    <div class="stats-card__content">
      <div class="stats-card__value">{{ formattedValue }}</div>
      <div class="stats-card__label">{{ label }}</div>
    </div>
    <div v-if="trend" class="stats-card__trend" :class="trendClass">
      <ion-icon :icon="trendIcon"></ion-icon>
      <span>{{ trend }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import { trendingUp, trendingDown } from 'ionicons/icons';
import { formatNumber, formatCurrency, formatSurface, formatPercentage } from '@/utils/formatters';

interface Props {
  icon: string;
  value: number;
  label: string;
  type?: 'number' | 'currency' | 'surface' | 'percentage';
  iconColor?: string;
  iconBgColor?: string;
  highlight?: boolean;
  trend?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'number',
  iconColor: '#6B4FFF',
  iconBgColor: 'rgba(107, 79, 255, 0.1)',
  highlight: false
});

const formattedValue = computed(() => {
  switch (props.type) {
    case 'currency':
      return formatCurrency(props.value);
    case 'surface':
      return formatSurface(props.value);
    case 'percentage':
      return formatPercentage(props.value);
    default:
      return formatNumber(props.value);
  }
});

const trendClass = computed(() => ({
  'stats-card__trend--up': props.trend && props.trend > 0,
  'stats-card__trend--down': props.trend && props.trend < 0
}));

const trendIcon = computed(() => {
  return props.trend && props.trend > 0 ? trendingUp : trendingDown;
});
</script>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 12px;
}

.stats-card--highlight {
  background: linear-gradient(135deg, #6B4FFF 0%, #4F46E5 100%);
}

.stats-card--highlight .stats-card__value,
.stats-card--highlight .stats-card__label {
  color: white;
}

.stats-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-card__icon ion-icon {
  font-size: 24px;
}

.stats-card__content {
  flex: 1;
  min-width: 0;
}

.stats-card__value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

.stats-card__label {
  font-size: 13px;
  color: #6B7280;
  margin-top: 2px;
}

.stats-card__trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
}

.stats-card__trend--up {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.stats-card__trend--down {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.stats-card__trend ion-icon {
  font-size: 14px;
}
</style>
