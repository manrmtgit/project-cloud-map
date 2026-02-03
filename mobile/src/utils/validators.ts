// Validation des emails
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation du mot de passe (minimum 6 caractères)
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// Validation du nom (non vide, au moins 2 caractères)
export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};

// Validation des coordonnées GPS
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

// Validation du titre de signalement
export const isValidTitle = (title: string): boolean => {
  return title.trim().length >= 3 && title.trim().length <= 200;
};

// Validation de la description
export const isValidDescription = (description: string): boolean => {
  return description.trim().length >= 10 && description.trim().length <= 1000;
};

// Messages d'erreur de validation
export const ValidationMessages = {
  email: {
    required: 'L\'email est requis',
    invalid: 'Format d\'email invalide'
  },
  password: {
    required: 'Le mot de passe est requis',
    minLength: 'Le mot de passe doit contenir au moins 6 caractères'
  },
  name: {
    required: 'Le nom est requis',
    minLength: 'Le nom doit contenir au moins 2 caractères'
  },
  title: {
    required: 'Le titre est requis',
    minLength: 'Le titre doit contenir au moins 3 caractères',
    maxLength: 'Le titre ne doit pas dépasser 200 caractères'
  },
  description: {
    required: 'La description est requise',
    minLength: 'La description doit contenir au moins 10 caractères',
    maxLength: 'La description ne doit pas dépasser 1000 caractères'
  },
  coordinates: {
    invalid: 'Coordonnées GPS invalides'
  }
};
