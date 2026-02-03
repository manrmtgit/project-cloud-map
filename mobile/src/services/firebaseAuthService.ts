import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  serverTimestamp
} from 'firebase/database';
import { app } from '@/config/firebase';
import type { User, LoginCredentials, ProfileUpdateData, AuthResponse } from '@/models';
import { SESSION_CONFIG } from '@/utils/constants';

const auth = getAuth(app);
const database = getDatabase(app);

// Interface pour les données utilisateur dans Firebase
interface FirebaseUserData {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  isBlocked: boolean;
  loginAttempts: number;
  lastLoginAttempt: number | null;
  createdAt: number;
  updatedAt: number;
}

// Service d'authentification Firebase
export const firebaseAuthService = {
  // Obtenir les données utilisateur depuis la base de données
  async getUserData(uid: string): Promise<FirebaseUserData | null> {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return snapshot.val() as FirebaseUserData;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      return null;
    }
  },

  // Vérifier si l'utilisateur est bloqué
  async checkIfBlocked(email: string): Promise<{ isBlocked: boolean; uid?: string }> {
    try {
      // Rechercher l'utilisateur par email dans la base de données
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const uid in users) {
          if (users[uid].email === email) {
            return {
              isBlocked: users[uid].isBlocked === true,
              uid
            };
          }
        }
      }
      return { isBlocked: false };
    } catch (error) {
      console.error('Erreur lors de la vérification du blocage:', error);
      return { isBlocked: false };
    }
  },

  // Incrémenter les tentatives de connexion
  async incrementLoginAttempts(uid: string): Promise<number> {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const newAttempts = (userData.loginAttempts || 0) + 1;
        const shouldBlock = newAttempts >= SESSION_CONFIG.MAX_LOGIN_ATTEMPTS;

        await update(userRef, {
          loginAttempts: newAttempts,
          lastLoginAttempt: serverTimestamp(),
          isBlocked: shouldBlock,
          updatedAt: serverTimestamp()
        });

        return newAttempts;
      }
      return 0;
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation des tentatives:', error);
      return 0;
    }
  },

  // Réinitialiser les tentatives de connexion après succès
  async resetLoginAttempts(uid: string): Promise<void> {
    try {
      const userRef = ref(database, `users/${uid}`);
      await update(userRef, {
        loginAttempts: 0,
        isBlocked: false,
        lastLoginAttempt: null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des tentatives:', error);
    }
  },

  // Connexion avec Firebase
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Vérifier d'abord si l'utilisateur est bloqué par email
    const blockCheck = await this.checkIfBlocked(email);
    if (blockCheck.isBlocked) {
      throw new Error('Votre compte est bloqué. Contactez un administrateur pour le débloquer.');
    }

    try {
      // Authentification Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Récupérer les données utilisateur depuis la base de données
      let userData = await this.getUserData(firebaseUser.uid);

      // Vérifier à nouveau si bloqué avec l'UID (double vérification)
      if (userData && userData.isBlocked) {
        await signOut(auth);
        throw new Error('Votre compte est bloqué. Contactez un administrateur pour le débloquer.');
      }

      // Si l'utilisateur n'existe pas dans la base, le créer
      if (!userData) {
        userData = {
          email: firebaseUser.email || email,
          nom: '',
          prenom: firebaseUser.displayName || '',
          role: 'mobile_user',
          isBlocked: false,
          loginAttempts: 0,
          lastLoginAttempt: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const userRef = ref(database, `users/${firebaseUser.uid}`);
        await set(userRef, userData);
      }

      // Réinitialiser les tentatives de connexion après succès
      await this.resetLoginAttempts(firebaseUser.uid);

      // Créer un token (utiliser l'ID token Firebase)
      const token = await firebaseUser.getIdToken();

      // Créer l'objet utilisateur
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        nom: userData.nom || '',
        prenom: userData.prenom || firebaseUser.displayName || '',
        role: (userData.role as 'mobile_user' | 'manager' | 'admin') || 'mobile_user'
      };

      // Stocker dans localStorage
      localStorage.setItem(SESSION_CONFIG.TOKEN_KEY, token);
      localStorage.setItem(SESSION_CONFIG.USER_KEY, JSON.stringify(user));

      return {
        message: 'Connexion réussie',
        user,
        token
      };
    } catch (error: any) {
      // Si c'est une erreur de blocage, la propager
      if (error.message && error.message.includes('bloqué')) {
        throw error;
      }

      // Gérer les erreurs Firebase Auth - Incrémenter les tentatives uniquement pour mauvais mot de passe
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        // Trouver l'utilisateur par email pour incrémenter ses tentatives
        if (blockCheck.uid) {
          const attempts = await this.incrementLoginAttempts(blockCheck.uid);
          if (attempts >= SESSION_CONFIG.MAX_LOGIN_ATTEMPTS) {
            throw new Error('Votre compte a été bloqué après trop de tentatives. Contactez un administrateur.');
          }
          throw new Error(`Email ou mot de passe incorrect. Tentative ${attempts}/${SESSION_CONFIG.MAX_LOGIN_ATTEMPTS}`);
        }
        throw new Error('Email ou mot de passe incorrect.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Aucun compte trouvé avec cet email.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Format d\'email invalide.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Trop de tentatives. Veuillez réessayer plus tard.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Email ou mot de passe incorrect.');
      }

      throw new Error(error.message || 'Erreur de connexion');
    }
  },

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem(SESSION_CONFIG.TOKEN_KEY);
      localStorage.removeItem(SESSION_CONFIG.USER_KEY);
    }
  },

  // Vérifier la session
  async checkSession(): Promise<{ valid: boolean; user?: User }> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe();

        if (firebaseUser) {
          const userData = await this.getUserData(firebaseUser.uid);

          if (userData && !userData.isBlocked) {
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              nom: userData.nom || '',
              prenom: userData.prenom || '',
              role: (userData.role as 'mobile_user' | 'manager' | 'admin') || 'mobile_user'
            };
            resolve({ valid: true, user });
          } else if (userData?.isBlocked) {
            await this.logout();
            resolve({ valid: false });
          } else {
            resolve({ valid: true, user: {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              nom: '',
              prenom: firebaseUser.displayName || '',
              role: 'mobile_user'
            }});
          }
        } else {
          resolve({ valid: false });
        }
      });
    });
  },

  // Mise à jour du profil
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // Mettre à jour le profil Firebase Auth
      if (data.prenom || data.nom) {
        await updateProfile(currentUser, {
          displayName: `${data.prenom || ''} ${data.nom || ''}`.trim()
        });
      }

      // Mettre à jour l'email si fourni
      if (data.email && data.email !== currentUser.email) {
        await updateEmail(currentUser, data.email);
      }

      // Mettre à jour le mot de passe si fourni
      if (data.password) {
        await updatePassword(currentUser, data.password);
      }

      // Mettre à jour les données dans la base de données
      const userRef = ref(database, `users/${currentUser.uid}`);
      const updateData: Partial<FirebaseUserData> = {
        updatedAt: Date.now()
      };

      if (data.nom) updateData.nom = data.nom;
      if (data.prenom) updateData.prenom = data.prenom;
      if (data.email) updateData.email = data.email;

      await update(userRef, updateData);

      // Récupérer les données mises à jour
      const userData = await this.getUserData(currentUser.uid);

      const user: User = {
        id: currentUser.uid,
        email: data.email || currentUser.email || '',
        nom: data.nom || userData?.nom || '',
        prenom: data.prenom || userData?.prenom || '',
        role: (userData?.role as 'mobile_user' | 'manager' | 'admin') || 'mobile_user'
      };

      // Mettre à jour le localStorage
      localStorage.setItem(SESSION_CONFIG.USER_KEY, JSON.stringify(user));

      return user;
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Veuillez vous reconnecter pour modifier ces informations.');
      }
      throw new Error(error.message || 'Erreur lors de la mise à jour du profil');
    }
  },

  // Récupérer l'utilisateur stocké localement
  getStoredUser(): User | null {
    const userJson = localStorage.getItem(SESSION_CONFIG.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Récupérer le token stocké
  getStoredToken(): string | null {
    return localStorage.getItem(SESSION_CONFIG.TOKEN_KEY);
  },

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  },

  // Obtenir l'utilisateur Firebase actuel
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
};

export default firebaseAuthService;
