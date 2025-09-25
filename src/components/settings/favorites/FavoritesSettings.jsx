import { useState } from 'react';
import { FiStar, FiPlus, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import SettingCard from '../SettingCard';
import FavoritesList from './FavoritesList';
import AddFavoriteModal from './AddFavoriteModal';
import { useFavorites } from '../../../hooks/useFavorites';
import { download } from '../../../utils/wallet';
import toast from 'react-hot-toast';

export default function FavoritesSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const { favorites } = useFavorites();

  const handleEdit = (favorite) => {
    setSelectedFavorite(favorite);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedFavorite(null);
  };

  const handleExportFavorites = () => {
    if (favorites.length === 0) {
      toast.error('No favorites to export');
      return;
    }

    const content = `Favorite Addresses Export\n\n${favorites.map((fav, index) => 
      `${index + 1}. ${fav.name}\n   Address: ${fav.address}\n   Added: ${new Date(fav.createdAt).toLocaleDateString()}\n`
    ).join('\n')}\n\nIMPORTANT:\n- Keep this information secure\n- These are your saved wallet addresses\n- Do not share with unauthorized parties\n- Export generated on: ${new Date().toLocaleString()}`;

    download(content, 'favorite-addresses.txt');
    toast.success('Favorites exported successfully');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Favorite Addresses
        </h2>
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={handleExportFavorites}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiDownload className="w-5 h-5" />
            <span>Export</span>
          </motion.button>
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Favorite</span>
          </motion.button>
        </div>
      </div>

      <SettingCard>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FiStar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Saved Addresses</h3>
            <p className="text-sm text-gray-500">Manage your favorite wallet addresses</p>
          </div>
        </div>

        <FavoritesList onEdit={handleEdit} />
      </SettingCard>

      <AddFavoriteModal
        isOpen={isModalOpen}
        onClose={handleClose}
        favorite={selectedFavorite}
      />
    </div>
  );
}