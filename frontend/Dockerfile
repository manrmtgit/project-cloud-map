# Étape de développement
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Exposer le port de Vite
EXPOSE 5173

# Commande de démarrage en mode développement
CMD ["npm", "run", "dev"]
