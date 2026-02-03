import React, { useState } from 'react';
import './PhotoModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PhotoModal = ({ photos, isOpen, onClose, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen || !photos || photos.length === 0) return null;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'photo-modal-overlay') {
      onClose();
    }
  };

  const currentPhoto = photos[selectedIndex];
  const photoUrl = currentPhoto.filename 
    ? `${API_URL}/uploads/${currentPhoto.filename}`
    : currentPhoto.url?.startsWith('http') 
      ? currentPhoto.url 
      : `${API_URL}${currentPhoto.url}`;

  return (
    <div className="photo-modal-overlay" onClick={handleOverlayClick}>
      <div className="photo-modal">
        <div className="photo-modal-header">
          <h3>📷 {title || 'Photos du signalement'}</h3>
          <span className="photo-counter">{selectedIndex + 1} / {photos.length}</span>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="photo-modal-content">
          {photos.length > 1 && (
            <button className="nav-btn prev" onClick={handlePrev}>❮</button>
          )}
          
          <div className="photo-container">
            <img 
              src={photoUrl} 
              alt={`Photo ${selectedIndex + 1}`}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f0f0f0" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%23999" font-size="16">Image non disponible</text></svg>';
              }}
            />
          </div>
          
          {photos.length > 1 && (
            <button className="nav-btn next" onClick={handleNext}>❯</button>
          )}
        </div>
        
        {photos.length > 1 && (
          <div className="photo-thumbnails">
            {photos.map((photo, index) => {
              const thumbUrl = photo.filename 
                ? `${API_URL}/uploads/${photo.filename}`
                : photo.url?.startsWith('http') 
                  ? photo.url 
                  : `${API_URL}${photo.url}`;
              return (
                <div 
                  key={photo.id || index}
                  className={`thumbnail ${index === selectedIndex ? 'active' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <img src={thumbUrl} alt={`Thumbnail ${index + 1}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoModal;
