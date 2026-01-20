# Utiliser l'image officielle Node.js
FROM node:20-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Exposer le port de l'application
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "start"]
