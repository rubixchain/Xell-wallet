import { useContext } from 'react';
import { motion } from 'framer-motion';
import { FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/userContext';
import { sliceString } from '../../utils/utils';

// FTs tab: lists every fungible token owned by the active DID. After the
// network merge, FTs are loaded for every (Rubix) network into `selectedTokens`
// (see Dashboard.loadAccountData), so this just renders them — no manual
// opt-in/add-token step. Each row shows FT Name, Balance and Creator DID.
export default function TokenList() {
    const { selectedTokens } = useContext(UserContext);

    const containerVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
    };

    const itemVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 }
    };

    const handleCopy = async (text) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (!selectedTokens?.length) {
        return (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                No fungible tokens owned by this account
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-4 max-h-96 overflow-y-auto"
        >
            {selectedTokens.map((token, index) => (
                <motion.div
                    key={token?.ft_name || index}
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 bg-tertiary text-primary font-semibold rounded-full flex items-center justify-center">
                            {token?.ft_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        <div className="min-w-0">
                            <h3 className="text-gray-900 dark:text-white font-medium truncate">
                                {token?.ft_name || 'Unnamed token'}
                            </h3>
                            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>Creator: {sliceString(token?.creator_did, 6)}</span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(token?.creator_did)}
                                    aria-label="Copy creator DID"
                                    className="p-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    <FiCopy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <p className="text-gray-900 dark:text-white text-base font-semibold">
                            {token?.ft_count}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Balance</p>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
}
