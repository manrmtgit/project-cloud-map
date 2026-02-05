const { db, isConfigured } = require('../config/firebase');
const { pool } = require('../config/database');

class FirebaseSyncService {
  // Envoyer les signalements PostgreSQL vers Firebase
  static async pushSignalementsToFirebase() {
    if (!isConfigured()) {
      throw new Error('Firebase non configuré');
    }

    try {
      // Récupérer tous les signalements depuis PostgreSQL avec leurs photos
      const result = await pool.query(`
        SELECT 
          s.id,
          s.titre,
          s.description,
          s.latitude,
          s.longitude,
          s.statut,
          s.avancement,
          s.surface_m2,
          s.budget,
          s.entreprise,
          s.date_nouveau,
          s.date_en_cours,
          s.date_termine,
          s.date_creation,
          s.date_mise_a_jour,
          s.user_id,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', p.id,
                'filename', p.filename,
                'url', p.url,
                'mimetype', p.mimetype,
                'size', p.size,
                'date_ajout', p.date_ajout
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) as photos
        FROM signalements s
        LEFT JOIN photos p ON s.id = p.signalement_id
        GROUP BY s.id
        ORDER BY s.id
      `);

      const signalements = result.rows;
      const batch = db.batch();
      let updateCount = 0;

      // Créer ou mettre à jour chaque signalement dans Firebase
      for (const signalement of signalements) {
        const docRef = db.collection('signalements').doc(signalement.id.toString());
        
        // Préparer les données pour Firebase (sérialisation JSON)
        const firebaseData = {
          id: signalement.id,
          titre: signalement.titre,
          description: signalement.description,
          latitude: parseFloat(signalement.latitude),
          longitude: parseFloat(signalement.longitude),
          statut: signalement.statut,
          avancement: parseInt(signalement.avancement) || 0,
          surface_m2: signalement.surface_m2 ? parseFloat(signalement.surface_m2) : null,
          budget: signalement.budget ? parseFloat(signalement.budget) : null,
          entreprise: signalement.entreprise,
          user_id: signalement.user_id,
          // Seulement inclure les dates qui existent
          ...(signalement.date_creation && { date_creation: signalement.date_creation.toISOString() }),
          ...(signalement.date_mise_a_jour && { date_mise_a_jour: signalement.date_mise_a_jour.toISOString() }),
          ...(signalement.date_nouveau && { date_nouveau: signalement.date_nouveau.toISOString() }),
          ...(signalement.date_en_cours && { date_en_cours: signalement.date_en_cours.toISOString() }),
          ...(signalement.date_termine && { date_termine: signalement.date_termine.toISOString() }),
          sync_timestamp: new Date().toISOString(),
          photos: signalement.photos || []
        };

        batch.set(docRef, firebaseData);
        updateCount++;
      }

      // Exécuter le batch
      await batch.commit();

      // Mettre à jour la métadata de synchronisation
      await db.collection('_metadata').doc('sync').set({
        last_sync: new Date().toISOString(),
        total_signalements: updateCount,
        sync_type: 'push_to_firebase'
      });

      return {
        success: true,
        message: `${updateCount} signalements synchronisés vers Firebase`,
        count: updateCount
      };

    } catch (error) {
      console.error('Erreur push Firebase:', error);
      throw error;
    }
  }

  // Récupérer les signalements depuis Firebase vers PostgreSQL
  static async pullSignalementsFromFirebase() {
    if (!isConfigured()) {
      throw new Error('Firebase non configuré');
    }

    try {
      // Récupérer tous les signalements depuis Firebase
      const snapshot = await db.collection('signalements').get();
      let insertCount = 0;
      let updateCount = 0;

      for (const doc of snapshot.docs) {
        const firebaseData = doc.data();
        const signalementId = parseInt(doc.id);

        // Vérifier si le signalement existe déjà en PostgreSQL
        const existingResult = await pool.query(
          'SELECT id, date_mise_a_jour FROM signalements WHERE id = $1',
          [signalementId]
        );

        if (existingResult.rows.length > 0) {
          // Mettre à jour si la version Firebase est plus récente
          const pgDate = new Date(existingResult.rows[0].date_mise_a_jour);
          const firebaseDate = new Date(firebaseData.date_mise_a_jour);

          if (firebaseDate > pgDate) {
            await this.updateSignalementFromFirebase(signalementId, firebaseData);
            updateCount++;
          }
        } else {
          // Insérer nouveau signalement
          await this.insertSignalementFromFirebase(firebaseData);
          insertCount++;
        }
      }

      return {
        success: true,
        message: `Synchronisation terminée: ${insertCount} nouveaux, ${updateCount} mis à jour`,
        inserted: insertCount,
        updated: updateCount
      };

    } catch (error) {
      console.error('Erreur pull Firebase:', error);
      throw error;
    }
  }

  // Insérer un nouveau signalement depuis Firebase
  static async insertSignalementFromFirebase(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insérer le signalement
      const result = await client.query(`
        INSERT INTO signalements (
          titre, description, latitude, longitude, statut, avancement,
          surface_m2, budget, entreprise, date_nouveau, date_en_cours, 
          date_termine, date_creation, date_mise_a_jour, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `, [
        data.titre,
        data.description,
        data.latitude,
        data.longitude,
        data.statut,
        data.avancement,
        data.surface_m2,
        data.budget,
        data.entreprise,
        data.date_nouveau ? new Date(data.date_nouveau) : null,
        data.date_en_cours ? new Date(data.date_en_cours) : null,
        data.date_termine ? new Date(data.date_termine) : null,
        new Date(data.date_creation),
        new Date(data.date_mise_a_jour),
        data.user_id
      ]);

      const signalementId = result.rows[0].id;

      // Insérer les photos s'il y en a
      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          await client.query(`
            INSERT INTO photos (signalement_id, filename, url, mimetype, size, date_ajout)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            signalementId,
            photo.filename,
            photo.url,
            photo.mimetype,
            photo.size,
            new Date(photo.date_ajout)
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Mettre à jour un signalement depuis Firebase
  static async updateSignalementFromFirebase(signalementId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mettre à jour le signalement
      await client.query(`
        UPDATE signalements SET
          titre = $1, description = $2, latitude = $3, longitude = $4,
          statut = $5, avancement = $6, surface_m2 = $7, budget = $8,
          entreprise = $9, date_nouveau = $10, date_en_cours = $11,
          date_termine = $12, date_mise_a_jour = $13
        WHERE id = $14
      `, [
        data.titre,
        data.description,
        data.latitude,
        data.longitude,
        data.statut,
        data.avancement,
        data.surface_m2,
        data.budget,
        data.entreprise,
        data.date_nouveau ? new Date(data.date_nouveau) : null,
        data.date_en_cours ? new Date(data.date_en_cours) : null,
        data.date_termine ? new Date(data.date_termine) : null,
        new Date(data.date_mise_a_jour),
        signalementId
      ]);

      // Supprimer les anciennes photos et insérer les nouvelles
      await client.query('DELETE FROM photos WHERE signalement_id = $1', [signalementId]);

      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          await client.query(`
            INSERT INTO photos (signalement_id, filename, url, mimetype, size, date_ajout)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            signalementId,
            photo.filename,
            photo.url,
            photo.mimetype,
            photo.size,
            new Date(photo.date_ajout)
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtenir les statistiques de synchronisation
  static async getSyncStats() {
    if (!isConfigured()) {
      return { firebase_configured: false };
    }

    try {
      // Stats PostgreSQL
      const pgResult = await pool.query('SELECT COUNT(*) as total FROM signalements');
      const pgCount = parseInt(pgResult.rows[0].total);

      // Stats Firebase
      const snapshot = await db.collection('signalements').get();
      const firebaseCount = snapshot.size;

      // Dernière synchronisation
      const metadataDoc = await db.collection('_metadata').doc('sync').get();
      const lastSync = metadataDoc.exists ? metadataDoc.data() : null;

      return {
        firebase_configured: true,
        postgresql_count: pgCount,
        firebase_count: firebaseCount,
        in_sync: pgCount === firebaseCount,
        last_sync: lastSync?.last_sync,
        last_sync_type: lastSync?.sync_type
      };

    } catch (error) {
      console.error('Erreur stats sync:', error);
      return { firebase_configured: true, error: error.message };
    }
  }
}

module.exports = FirebaseSyncService;