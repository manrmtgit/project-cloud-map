const { db, isConfigured } = require('../config/firebase');
const { pool } = require('../config/database');

class FirebaseSyncService {

  static normalizePhotos(firebasePhotos) {
    if (!firebasePhotos || !Array.isArray(firebasePhotos)) return [];
    const normalized = [];
    firebasePhotos.forEach((photo, idx) => {
      if (!photo) return;
      // Mobile envoie souvent des dataURL (string). On les transforme en enregistrement photo complet.
      if (typeof photo === 'string') {
        const match = photo.match(/^data:(.*?);base64,(.*)$/);
        const mimetype = match?.[1] || 'image/jpeg';
        normalized.push({
          filename: `mobile-${Date.now()}-${idx}.jpg`,
          url: null,
          mimetype,
          size: 0,
          base64_data: photo
        });
        return;
      }

      // Déjà un objet structuré
      if (photo.filename || photo.base64_data || photo.url) {
        normalized.push({
          filename: photo.filename || `mobile-${Date.now()}-${idx}.jpg`,
          url: photo.url || (photo.filename ? `/uploads/${photo.filename}` : null),
          mimetype: photo.mimetype || 'image/jpeg',
          size: photo.size || 0,
          base64_data: photo.base64_data || photo.base64 || null
        });
      }
    });
    return normalized;
  }

  /**
   * Push TOUT vers Firebase: signalements + utilisateurs + types_reparation + parametres
   */
  static async pushSignalementsToFirebase() {
    if (!isConfigured()) throw new Error('Firebase non configuré — vérifiez FIREBASE_DATABASE_URL');

    try {
      // 1. Push signalements avec info utilisateur et photos base64
      const result = await pool.query(`
        SELECT 
          s.id, s.titre, s.description, s.latitude, s.longitude,
          s.statut, s.avancement, s.niveau, s.surface_m2, s.prix_par_m2, s.budget, s.entreprise,
          s.type_reparation_id, s.utilisateur_id,
          u.nom as utilisateur_nom, u.email as utilisateur_email,
          s.date_nouveau, s.date_en_cours, s.date_termine,
          s.date_creation, s.date_mise_a_jour,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', p.id, 'filename', p.filename, 'url', p.url,
                'mimetype', p.mimetype, 'size', p.size, 'base64_data', p.base64_data, 'date_ajout', p.date_ajout
              )
            ) FILTER (WHERE p.id IS NOT NULL), '[]'::json
          ) as photos
        FROM signalements s
        LEFT JOIN utilisateurs u ON s.utilisateur_id = u.id
        LEFT JOIN photos p ON s.id = p.signalement_id
        GROUP BY s.id, u.nom, u.email ORDER BY s.id
      `);

      const statutMap = { 'NOUVEAU': 'nouveau', 'EN_COURS': 'en_cours', 'TERMINE': 'termine' };
      const signalementsBatch = {};
      let count = 0;

      for (const s of result.rows) {
        const key = `sig_${s.id}`;
        const photosMeta = s.photos || [];
        // Compat mobile: photos = tableau de dataURL/URL, photo_url = première entrée
        const photos = photosMeta
          .map((p) => p?.base64_data || p?.base64 || p?.url || null)
          .filter(Boolean);
        signalementsBatch[key] = {
          titre: s.titre || '',
          description: s.description || '',
          latitude: parseFloat(s.latitude),
          longitude: parseFloat(s.longitude),
          type: 'autre',
          statut: statutMap[s.statut] || s.statut?.toLowerCase() || 'nouveau',
          avancement: parseInt(s.avancement) || 0,
          niveau: parseInt(s.niveau) || 1,
          surface_m2: s.surface_m2 ? parseFloat(s.surface_m2) : null,
          prix_par_m2: s.prix_par_m2 ? parseFloat(s.prix_par_m2) : null,
          budget: s.budget ? parseFloat(s.budget) : null,
          entreprise: s.entreprise || null,
          utilisateur_id: s.utilisateur_id || null,
          user_id: s.utilisateur_id || null,
          user_name: s.utilisateur_nom || null,
          user_email: s.utilisateur_email || null,
          date_creation: s.date_creation ? s.date_creation.toISOString() : new Date().toISOString(),
          date_modification: s.date_mise_a_jour ? s.date_mise_a_jour.toISOString() : null,
          date_nouveau: s.date_nouveau ? s.date_nouveau.toISOString() : null,
          date_en_cours: s.date_en_cours ? s.date_en_cours.toISOString() : null,
          date_termine: s.date_termine ? s.date_termine.toISOString() : null,
          pg_id: s.id,
          sync_timestamp: new Date().toISOString(),
          photos,
          photo_url: photos[0] || null,
          photos_meta: photosMeta
        };
        count++;
      }

      // 2. Push utilisateurs
      const usersResult = await pool.query(`
        SELECT u.id, u.nom, u.email, r.nom as role, u.compte_bloque, u.date_creation
        FROM utilisateurs u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.id
      `);
      const usersBatch = {};
      for (const u of usersResult.rows) {
        usersBatch[`user_${u.id}`] = {
          id: u.id, nom: u.nom, email: u.email, role: u.role,
          compte_bloque: u.compte_bloque, date_creation: u.date_creation?.toISOString()
        };
      }

      // 3. Push types de réparation
      const typesResult = await pool.query('SELECT * FROM types_reparation ORDER BY niveau');
      const typesBatch = {};
      for (const t of typesResult.rows) {
        typesBatch[`type_${t.id}`] = { id: t.id, nom: t.nom, niveau: t.niveau, description: t.description };
      }

      // 4. Push paramètres
      const paramsResult = await pool.query('SELECT * FROM parametres');
      const paramsBatch = {};
      for (const p of paramsResult.rows) {
        paramsBatch[p.cle] = { valeur: p.valeur, description: p.description };
      }

      // Écrire chaque signalement individuellement pour éviter les limites Firebase
      for (const [key, data] of Object.entries(signalementsBatch)) {
        try {
          await db.set(`signalements/${key}`, data);
        } catch (e) {
          console.error(`Erreur push signalement ${key}:`, e.message);
        }
      }
      await db.set('utilisateurs', usersBatch);
      await db.set('types_reparation', typesBatch);
      await db.set('parametres', paramsBatch);

      // 5. Push profils utilisateurs vers `users/` (format compatible mobile)
      // Le mobile lit: users/{firebase_uid} = { email, nom, prenom, role, isBlocked, loginAttempts }
      // On écrit sous user_{pg_id} pour les users PG (le vrai Firebase UID est écrit à la création)
      for (const u of usersResult.rows) {
        try {
          await db.update(`users_pg/user_${u.id}`, {
            email: u.email, nom: u.nom, prenom: '',
            role: u.role || 'UTILISATEUR',
            isBlocked: u.compte_bloque || false,
            loginAttempts: 0, pg_id: u.id,
            updatedAt: Date.now()
          });
        } catch (e) {
          console.warn(`users_pg push error for user_${u.id}:`, e.message);
        }
      }

      // Metadata
      try {
        await db.set('_metadata/sync', {
          last_sync: new Date().toISOString(),
          total_signalements: count,
          total_utilisateurs: usersResult.rows.length,
          sync_type: 'push_to_firebase'
        });
      } catch (e) { console.warn('Impossible d\'écrire _metadata'); }

      return {
        success: true,
        message: `${count} signalements + ${usersResult.rows.length} utilisateurs envoyés vers Firebase`,
        count,
        users_count: usersResult.rows.length
      };
    } catch (error) {
      console.error('Erreur push Firebase:', error);
      if (error.message?.includes('401') || error.message?.includes('Permission')) {
        throw new Error('Permission refusée. Mettez ".write": true dans les règles Firebase.');
      }
      throw error;
    }
  }

  /**
   * Pull signalements depuis Firebase vers PostgreSQL
   */
  static async pullSignalementsFromFirebase() {
    if (!isConfigured()) throw new Error('Firebase non configuré');

    try {
      const data = await db.get('signalements');
      let insertCount = 0, updateCount = 0;

      if (!data) return { success: true, message: 'Aucun signalement dans Firebase', inserted: 0, updated: 0 };

      const statutMap = { 'nouveau': 'NOUVEAU', 'en_cours': 'EN_COURS', 'termine': 'TERMINE' };
      const errors = [];

      for (const [key, firebaseData] of Object.entries(data)) {
        if (!firebaseData || typeof firebaseData !== 'object') continue;
        try {
          const pgId = firebaseData.pg_id || null;
          if (pgId) {
            const existing = await pool.query('SELECT id, date_mise_a_jour FROM signalements WHERE id = $1', [pgId]);
            if (existing.rows.length > 0) {
              const pgDate = new Date(existing.rows[0].date_mise_a_jour || 0);
              const fbDateRaw = firebaseData.date_modification || firebaseData.sync_timestamp || firebaseData.date_creation || firebaseData.date_nouveau || null;
              const fbDate = fbDateRaw ? new Date(fbDateRaw) : null;
              // Si pas de date côté Firebase ou date plus récente, on met à jour.
              if (!fbDate || isNaN(fbDate.getTime()) || fbDate > pgDate) {
                await this.updateSignalementFromFirebase(pgId, firebaseData, statutMap);
                updateCount++;
              }
            } else {
              // Le pg_id n'existe pas en base : on insère un nouveau signalement et on renverra le nouvel id à Firebase.
              await this.insertSignalementFromFirebase(key, firebaseData, statutMap);
              insertCount++;
            }
          } else {
            await this.insertSignalementFromFirebase(key, firebaseData, statutMap);
            insertCount++;
          }
        } catch (itemError) {
          console.error(`Erreur sync "${key}":`, itemError.message);
          errors.push({ key, error: itemError.message });
        }
      }

      // Marquer la date de pull dans les métadonnées
      try {
        await db.set('_metadata/sync', {
          last_sync: new Date().toISOString(),
          total_signalements: Object.keys(data).length,
          sync_type: 'pull_from_firebase'
        });
      } catch (e) { console.warn('Impossible d\'écrire _metadata après pull'); }

      return {
        success: true,
        message: `Sync terminée: ${insertCount} nouveaux, ${updateCount} mis à jour${errors.length ? `, ${errors.length} erreurs` : ''}`,
        inserted: insertCount, updated: updateCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Erreur pull Firebase:', error);
      throw error;
    }
  }

  static async insertSignalementFromFirebase(firebaseKey, data, statutMap) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const statut = statutMap[data.statut] || 'NOUVEAU';
      const avancement = statut === 'TERMINE' ? 100 : statut === 'EN_COURS' ? 50 : 0;

      // Résoudre utilisateur PG : entier direct, ou recherche par email pour Firebase UID
      let utilisateurId = null;
      const rawUserId = data.user_id || data.utilisateur_id;
      if (rawUserId && Number.isInteger(Number(rawUserId))) {
        utilisateurId = parseInt(rawUserId);
      } else if (data.user_email) {
        // Firebase UID string — resolve by email
        try {
          const userResult = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [data.user_email]);
          if (userResult.rows.length > 0) utilisateurId = userResult.rows[0].id;
        } catch (e) { console.warn('Résolution user_email échouée:', e.message); }
      }

      const result = await client.query(`
        INSERT INTO signalements (
          titre, description, latitude, longitude, statut, avancement,
          niveau, surface_m2, entreprise, utilisateur_id,
          date_nouveau, date_en_cours, date_termine, date_creation
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `, [
        data.titre || 'Sans titre', data.description || '',
        data.latitude, data.longitude, statut, avancement,
        data.niveau || 1, data.surface_m2 || null, data.entreprise || null, utilisateurId,
        data.date_nouveau ? new Date(data.date_nouveau) : (statut === 'NOUVEAU' ? new Date(data.date_creation) : null),
        data.date_en_cours ? new Date(data.date_en_cours) : null,
        data.date_termine ? new Date(data.date_termine) : null,
        new Date(data.date_creation)
      ]);

      const newId = result.rows[0].id;

      // Insert photos from Firebase (with base64_data)
      const photos = this.normalizePhotos(data.photos);
      if (photos.length > 0) {
        for (const photo of photos) {
          try {
            await client.query(`
              INSERT INTO photos (signalement_id, filename, url, mimetype, size, base64_data)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [newId, photo.filename, photo.url || `/uploads/${photo.filename}`, photo.mimetype || 'image/jpeg', photo.size || 0, photo.base64_data || null]);
          } catch (e) { console.warn(`Photo insert error: ${e.message}`); }
        }
      }

      await db.update(`signalements/${firebaseKey}`, { pg_id: newId, sync_timestamp: new Date().toISOString() });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateSignalementFromFirebase(signalementId, data, statutMap) {
    const statut = statutMap[data.statut] || 'NOUVEAU';
    const avancement = statut === 'TERMINE' ? 100 : statut === 'EN_COURS' ? 50 : 0;
    await pool.query(`
      UPDATE signalements SET
        titre=$1, description=$2, latitude=$3, longitude=$4,
        statut=$5, avancement=$6, niveau=$7, surface_m2=$8,
        entreprise=$9, date_nouveau=$10, date_en_cours=$11, date_termine=$12
      WHERE id=$13
    `, [
      data.titre || 'Sans titre', data.description || '',
      data.latitude, data.longitude, statut, avancement,
      data.niveau || 1, data.surface_m2 || null, data.entreprise || null,
      data.date_nouveau ? new Date(data.date_nouveau) : null,
      data.date_en_cours ? new Date(data.date_en_cours) : null,
      data.date_termine ? new Date(data.date_termine) : null,
      signalementId
    ]);

    // Synchroniser les photos si fournies
    const photos = this.normalizePhotos(data.photos);
    if (photos.length > 0) {
      await pool.query('DELETE FROM photos WHERE signalement_id = $1', [signalementId]);
      for (const photo of photos) {
        try {
          await pool.query(`
            INSERT INTO photos (signalement_id, filename, url, mimetype, size, base64_data)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [signalementId, photo.filename, photo.url || `/uploads/${photo.filename}`, photo.mimetype || 'image/jpeg', photo.size || 0, photo.base64_data || null]);
        } catch (e) { console.warn(`Photo update error: ${e.message}`); }
      }
    }
  }

  static async getSyncStats() {
    if (!isConfigured()) return { firebase_configured: false };
    try {
      const pgResult = await pool.query('SELECT COUNT(*) as total FROM signalements');
      const pgCount = parseInt(pgResult.rows[0].total);
      const data = await db.get('signalements');
      const firebaseCount = data ? Object.keys(data).filter(k => data[k] !== null).length : 0;
      let metadata = null;
      try { metadata = await db.get('_metadata/sync'); } catch (e) {}
      return {
        firebase_configured: true, postgresql_count: pgCount, firebase_count: firebaseCount,
        in_sync: pgCount === firebaseCount,
        last_sync: metadata?.last_sync || null, last_sync_type: metadata?.sync_type || null
      };
    } catch (error) {
      return { firebase_configured: true, error: error.message };
    }
  }
}

module.exports = FirebaseSyncService;
