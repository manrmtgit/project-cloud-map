// Service de stockage local pour les photos
// Utilise IndexedDB pour stocker les images en base64 localement

const DB_NAME = 'cloudmap_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

interface StoredPhoto {
  id: string;
  signalementId: string;
  dataUrl: string;
  timestamp: number;
}

class LocalStorageService {
  private db: IDBDatabase | null = null;

  // Initialiser IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture de IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store pour les photos
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('signalementId', 'signalementId', { unique: false });
        }
      };
    });
  }

  // Sauvegarder une photo localement
  async savePhoto(signalementId: string, dataUrl: string): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const id = `photo_${signalementId}_${Date.now()}`;
    const photo: StoredPhoto = {
      id,
      signalementId,
      dataUrl,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(photo);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = () => {
        console.error('Erreur lors de la sauvegarde de la photo:', request.error);
        reject(request.error);
      };
    });
  }

  // Sauvegarder plusieurs photos
  async saveMultiplePhotos(signalementId: string, dataUrls: string[]): Promise<string[]> {
    const ids: string[] = [];

    for (const dataUrl of dataUrls) {
      const id = await this.savePhoto(signalementId, dataUrl);
      ids.push(id);
    }

    return ids;
  }

  // Récupérer une photo par ID
  async getPhoto(id: string): Promise<string | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const photo = request.result as StoredPhoto | undefined;
        resolve(photo ? photo.dataUrl : null);
      };

      request.onerror = () => {
        console.error('Erreur lors de la récupération de la photo:', request.error);
        reject(request.error);
      };
    });
  }

  // Récupérer toutes les photos d'un signalement
  async getPhotosBySignalement(signalementId: string): Promise<string[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('signalementId');
      const request = index.getAll(signalementId);

      request.onsuccess = () => {
        const photos = request.result as StoredPhoto[];
        resolve(photos.map(p => p.dataUrl));
      };

      request.onerror = () => {
        console.error('Erreur lors de la récupération des photos:', request.error);
        reject(request.error);
      };
    });
  }

  // Supprimer une photo
  async deletePhoto(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Erreur lors de la suppression de la photo:', request.error);
        reject(request.error);
      };
    });
  }

  // Supprimer toutes les photos d'un signalement
  async deletePhotosBySignalement(signalementId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('signalementId');
      const request = index.getAllKeys(signalementId);

      request.onsuccess = () => {
        const keys = request.result;
        keys.forEach(key => store.delete(key));
        resolve();
      };

      request.onerror = () => {
        console.error('Erreur lors de la suppression des photos:', request.error);
        reject(request.error);
      };
    });
  }

  // Convertir un Blob en base64
  blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;
