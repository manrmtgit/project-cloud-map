// ==========================================================
// Documentation Swagger pour toutes les routes de l'API
// ==========================================================

// ===================== AUTH ROUTES =====================

/**
 * @swagger
 * tags:
 *   - name: Authentification
 *     description: Inscription, connexion, gestion des tokens et sessions
 *   - name: Utilisateurs
 *     description: Gestion des profils utilisateurs
 *   - name: Signalements
 *     description: CRUD des signalements routiers
 *   - name: Photos
 *     description: Gestion des photos de signalements
 *   - name: Statistiques
 *     description: Statistiques et tableaux de bord
 *   - name: Notifications
 *     description: Gestion des notifications
 *   - name: Paramètres
 *     description: Configuration du backoffice (prix_par_m2, etc.)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Données invalides ou email déjà utilisé
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     description: |
 *       Authentifie un utilisateur par email/mot de passe.
 *       Le nombre de tentatives est limité (par défaut 3).
 *       Après dépassement, le compte est bloqué jusqu'à réinitialisation par un admin.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 attempts:
 *                   type: integer
 *                   description: Nombre de tentatives effectuées
 *                 remaining_attempts:
 *                   type: integer
 *                   description: Tentatives restantes avant blocage
 *       403:
 *         description: Compte bloqué
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedLoginResponse'
 */

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Vérifier la validité d'un token JWT
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 session:
 *                   type: object
 *                   properties:
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Token invalide ou expiré
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchir le token JWT
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nouveau token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Non authentifié
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion (invalide la session courante)
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */

/**
 * @swagger
 * /api/auth/config:
 *   get:
 *     summary: Obtenir la configuration des tentatives de connexion
 *     tags: [Authentification]
 *     responses:
 *       200:
 *         description: Configuration actuelle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 max_login_attempts:
 *                   type: integer
 *                   example: 3
 *                 session_duration:
 *                   type: string
 *                   example: "24h"
 */

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Lister les sessions actives de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des sessions actives
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/auth/blocked-users:
 *   get:
 *     summary: Lister tous les utilisateurs bloqués
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs bloqués
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 blocked_users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       attempts:
 *                         type: integer
 *                       blocked_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/auth/unblock/{userId}:
 *   post:
 *     summary: Débloquer un utilisateur bloqué
 *     description: Réinitialise les tentatives de connexion et débloque le compte
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'utilisateur à débloquer
 *     responses:
 *       200:
 *         description: Utilisateur débloqué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur non trouvé
 */

// ===================== USER ROUTES =====================

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Obtenir le profil de l'utilisateur connecté
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *   put:
 *     summary: Mettre à jour le profil
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *   delete:
 *     summary: Supprimer le compte
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compte supprimé
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lister tous les utilisateurs
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */

// ===================== SIGNALEMENT ROUTES =====================

/**
 * @swagger
 * /api/signalements:
 *   get:
 *     summary: Lister tous les signalements
 *     tags: [Signalements]
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [NOUVEAU, EN_COURS, TERMINE]
 *         description: Filtrer par statut
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par utilisateur
 *     responses:
 *       200:
 *         description: Liste des signalements avec photos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 signalements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Signalement'
 *   post:
 *     summary: Créer un signalement
 *     tags: [Signalements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSignalementRequest'
 *     responses:
 *       201:
 *         description: Signalement créé
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */

/**
 * @swagger
 * /api/signalements/stats:
 *   get:
 *     summary: Obtenir les statistiques des signalements
 *     tags: [Statistiques]
 *     responses:
 *       200:
 *         description: Statistiques globales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   $ref: '#/components/schemas/Stats'
 */

/**
 * @swagger
 * /api/signalements/stats/detailed:
 *   get:
 *     summary: Obtenir les statistiques détaillées (manager)
 *     tags: [Statistiques]
 *     responses:
 *       200:
 *         description: Statistiques détaillées avec délais, entreprises et évolution mensuelle
 */

/**
 * @swagger
 * /api/signalements/suggest-coordinates:
 *   get:
 *     summary: Suggérer des coordonnées GPS (quartiers d'Antananarivo)
 *     tags: [Signalements]
 *     responses:
 *       200:
 *         description: Suggestion de coordonnées avec liste des quartiers
 */

/**
 * @swagger
 * /api/signalements/{id}:
 *   get:
 *     summary: Obtenir un signalement par ID
 *     tags: [Signalements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du signalement
 *       404:
 *         description: Signalement non trouvé
 *   put:
 *     summary: Mettre à jour un signalement
 *     description: |
 *       Met à jour les informations d'un signalement. Le changement de statut
 *       déclenche automatiquement le calcul de l'avancement et les dates :
 *       - NOUVEAU → 0%
 *       - EN_COURS → 50% (date_en_cours renseignée)
 *       - TERMINE → 100% (date_termine renseignée)
 *       Le budget est calculé automatiquement : prix_par_m2 × niveau × surface_m2
 *     tags: [Signalements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSignalementRequest'
 *     responses:
 *       200:
 *         description: Signalement mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Signalement non trouvé
 *   delete:
 *     summary: Supprimer un signalement
 *     tags: [Signalements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Signalement supprimé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Signalement non trouvé
 */

// ===================== PHOTO ROUTES =====================

/**
 * @swagger
 * /api/signalements/{id}/photos:
 *   get:
 *     summary: Obtenir les photos d'un signalement
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des photos
 *   post:
 *     summary: Ajouter des photos à un signalement
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Photos ajoutées
 *       401:
 *         description: Non authentifié
 */

/**
 * @swagger
 * /api/signalements/photos/{photoId}:
 *   delete:
 *     summary: Supprimer une photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Photo supprimée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Photo non trouvée
 */

// ===================== NOTIFICATION ROUTES =====================

/**
 * @swagger
 * /api/signalements/notifications/{userId}:
 *   get:
 *     summary: Obtenir les notifications d'un utilisateur
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des notifications avec compteur non-lues
 */

/**
 * @swagger
 * /api/signalements/notifications/{notifId}/read:
 *   put:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notifId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 */

/**
 * @swagger
 * /api/signalements/notifications/{userId}/read-all:
 *   put:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 */

// ===================== SETTINGS ROUTES =====================

/**
 * @swagger
 * /api/signalements/settings:
 *   get:
 *     summary: Obtenir les paramètres de configuration
 *     description: Récupère les paramètres du backoffice, notamment le prix_par_m2 utilisé pour le calcul automatique des budgets
 *     tags: [Paramètres]
 *     responses:
 *       200:
 *         description: Paramètres de configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settings:
 *                   type: object
 *                 prix_par_m2:
 *                   type: number
 *                   example: 50000
 *   put:
 *     summary: Mettre à jour un paramètre de configuration
 *     description: |
 *       Met à jour un paramètre du backoffice.
 *       Si le prix_par_m2 est modifié, tous les budgets existants sont automatiquement recalculés
 *       avec la formule : budget = prix_par_m2 * niveau * surface_m2
 *     tags: [Paramètres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cle, valeur]
 *             properties:
 *               cle:
 *                 type: string
 *                 example: prix_par_m2
 *               valeur:
 *                 type: string
 *                 example: "75000"
 *     responses:
 *       200:
 *         description: Paramètre mis à jour
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
