<template>
  <div class="user-avatar" :style="avatarStyle" @click="$emit('click')">
    <img v-if="src" :src="src" :alt="alt" class="avatar-image" />
    <span v-else class="avatar-initials">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { THEME_COLORS } from '@/utils/constants';

interface Props {
  src?: string;
  initials?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  initials: '?',
  size: 'medium',
  alt: 'Avatar'
});

defineEmits(['click']);

const sizeMap = {
  small: '32px',
  medium: '48px',
  large: '64px',
  xlarge: '96px'
};

const fontSizeMap = {
  small: '14px',
  medium: '18px',
  large: '24px',
  xlarge: '36px'
};

const avatarStyle = computed(() => ({
  width: sizeMap[props.size],
  height: sizeMap[props.size],
  fontSize: fontSizeMap[props.size],
  backgroundColor: props.src ? 'transparent' : THEME_COLORS.primary
}));
</script>

<style scoped>
.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-avatar:active {
  transform: scale(0.95);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  text-transform: uppercase;
  user-select: none;
}
</style>
