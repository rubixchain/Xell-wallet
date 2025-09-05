import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Load favorites from localStorage
    const stored = localStorage.getItem('favorites');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const saveFavorites = (newFavorites) => {
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const addFavorite = (favorite) => {
    const newFavorite = {
      ...favorite,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    saveFavorites([...favorites, newFavorite]);
  };

  const updateFavorite = (updatedFavorite) => {
    const newFavorites = favorites.map(f => 
      f.id === updatedFavorite.id ? updatedFavorite : f
    );
    saveFavorites(newFavorites);
  };

  const removeFavorite = (id) => {
    saveFavorites(favorites.filter(f => f.id !== id));
  };

  return {
    favorites,
    addFavorite,
    updateFavorite,
    removeFavorite
  };
}