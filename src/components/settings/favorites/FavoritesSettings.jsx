import { useRef, useState } from 'react';
import { FiStar, FiPlus, FiDownload, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import SettingCard from '../SettingCard';
import FavoritesList from './FavoritesList';
import AddFavoriteModal from './AddFavoriteModal';
import { useFavorites } from '../../../hooks/useFavorites';

export default function FavoritesSettings() {
  const { favorites, addFavorite, updateFavorite, removeFavorite, exportFavorites, importFavorites } = useFavorites();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const fileInputRef = useRef(null);

  const handleEdit = (favorite) => {
    setSelectedFavorite(favorite);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedFavorite(null);
  };

  const handleExport = () => {
    if (favorites.length === 0) {
      toast.error('No favourites to export');
      return;
    }
    exportFavorites();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const added = await importFavorites(file);
      toast.success(added > 0 ? `Imported ${added} favourite${added > 1 ? 's' : ''}` : 'No new favourites to import');
    } catch {
      toast.error('Could not import. Please select a valid favourites file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Favorite Addresses
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiUpload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-light transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <SettingCard>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FiStar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Saved Addresses</h3>
            <p className="text-sm text-gray-500">Specific to this account. Export to back up or move to another device.</p>
          </div>
        </div>

        <FavoritesList favorites={favorites} removeFavorite={removeFavorite} onEdit={handleEdit} />
      </SettingCard>

      <AddFavoriteModal
        isOpen={isModalOpen}
        onClose={handleClose}
        favorite={selectedFavorite}
        addFavorite={addFavorite}
        updateFavorite={updateFavorite}
      />
    </div>
  );
}
