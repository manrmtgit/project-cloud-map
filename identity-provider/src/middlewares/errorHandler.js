const errorHandler = (err, req, res, next) => {
    console.error('Erreur:', err.message);

    // Erreur de validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Erreur de validation',
            details: err.message
        });
    }

    // Erreur JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token invalide'
        });
    }

    // Erreur JWT expiré
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expiré'
        });
    }

    // Erreur par défaut
    res.status(err.status || 500).json({
        error: err.message || 'Erreur interne du serveur'
    });
};

module.exports = errorHandler;
