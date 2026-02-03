// Formatage de date en français
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Formatage de date avec heure
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatage de date relative (il y a...)
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(dateString);
};

// Formatage de nombre avec séparateur de milliers
export const formatNumber = (num: number): string => {
  return num.toLocaleString('fr-FR');
};

// Formatage de montant en Ariary
export const formatCurrency = (amount: number): string => {
  return `${formatNumber(amount)} Ar`;
};

// Formatage de surface en m²
export const formatSurface = (surface: number): string => {
  return `${formatNumber(surface)} m²`;
};

// Formatage du pourcentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Troncature de texte avec ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Capitalisation de la première lettre
export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Formatage des initiales
export const getInitials = (nom: string, prenom: string): string => {
  const n = nom ? nom.charAt(0).toUpperCase() : '';
  const p = prenom ? prenom.charAt(0).toUpperCase() : '';
  return `${p}${n}`;
};
