import { useContext, useState, useEffect } from 'react';
import { download } from '../utils/wallet';
import { UserContext } from '../context/userContext';

// Legacy global key (favourites used to be shared across all accounts).
export const FAVORITES_KEY = 'favorites';

// Favourites are now scoped per account (by DID). New accounts seed their list
// from the legacy global list the first time, then diverge independently.
export const favoritesKey = (did) => (did ? `favorites:${did}` : FAVORITES_KEY);

export function useFavorites() {
  const { userDetails } = useContext(UserContext);
  const did = userDetails?.did;
  const storageKey = favoritesKey(did);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!did) {
      setFavorites([]);
      return;
    }
    let stored = localStorage.getItem(storageKey);
    if (stored == null) {
      // First time this account opens favourites: seed from the legacy global
      // list so existing favourites aren't lost.
      const legacy = localStorage.getItem(FAVORITES_KEY);
      if (legacy != null) {
        localStorage.setItem(storageKey, legacy);
        stored = legacy;
      }
    }
    try {
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  }, [did, storageKey]);

  const saveFavorites = (newFavorites) => {
    localStorage.setItem(storageKey, JSON.stringify(newFavorites));
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

  // Download the favourites list as a JSON file so it can be restored on
  // another device or browser.
  const exportFavorites = () => {
    download(JSON.stringify(favorites, null, 2), 'xell-favorites.json');
  };

  // Merge favourites from an exported JSON file, de-duplicating by address.
  // Returns the number of new entries added.
  const importFavorites = async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid favourites file');
    }
    const merged = [...favorites];
    let added = 0;
    parsed.forEach((item) => {
      const address = item?.address?.trim();
      if (address && !merged.some(f => f.address === address)) {
        merged.push({
          id: `${Date.now()}-${added}`,
          name: item?.name?.trim() || 'Imported',
          address,
          createdAt: item?.createdAt || new Date().toISOString()
        });
        added += 1;
      }
    });
    saveFavorites(merged);
    return added;
  };

  return {
    favorites,
    addFavorite,
    updateFavorite,
    removeFavorite,
    exportFavorites,
    importFavorites
  };
}
