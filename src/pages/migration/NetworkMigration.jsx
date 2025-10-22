import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateToNetworkStructure, getMigrationProgress } from '../../indexDB/migration';
import indexDBUtil from '../../indexDB/index';
import toast from 'react-hot-toast';
import { ROUTES } from '../../routes/routes';

export default function NetworkMigration() {
    const navigate = useNavigate();
    const [migrating, setMigrating] = useState(false);
    const [progress, setProgress] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [migrationStatus, setMigrationStatus] = useState({});

    useEffect(() => {
        loadMigrationData();
    }, []);

    const loadMigrationData = async () => {
        try {
            const progressData = await getMigrationProgress();
            setProgress(progressData);

            const accountsData = await indexDBUtil.getAllAccountsForMigration();
            setAccounts(accountsData);

            const initialStatus = {};
            accountsData.forEach(acc => {
                initialStatus[acc.username] = 'pending';
            });
            setMigrationStatus(initialStatus);
        } catch (error) {
            toast.error('Failed to load migration data');
        }
    };

    const handleMigrate = async () => {
        setMigrating(true);

        try {
            setMigrationStatus(prev => {
                const updated = {};
                Object.keys(prev).forEach(username => {
                    updated[username] = 'migrating';
                });
                return updated;
            });

            const result = await migrateToNetworkStructure();

            if (result.status) {
                const finalStatus = {};
                result.results.success.forEach(username => {
                    finalStatus[username] = 'success';
                });
                result.results.failed.forEach(username => {
                    finalStatus[username] = 'failed';
                });
                setMigrationStatus(finalStatus);

                toast.success(result.message);

                setTimeout(() => {
                    navigate(ROUTES.LOGIN, { replace: true });
                }, 2000);
            } else {
                toast.error(result.message || 'Migration failed');
                setMigrating(false);
            }
        } catch (error) {
            toast.error('Migration failed: ' + error.message);
            setMigrating(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return '⏳';
            case 'migrating':
                return '🔄';
            case 'success':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return '⏳';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="bg-secondary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-senary dark:text-white mb-2">
                        Network Restructure Update
                    </h1>
                    <p className="text-quinary dark:text-gray-400 text-sm">
                        We've updated our network architecture!
                    </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900 dark:text-blue-200 mb-3">
                        Your accounts are being migrated to the new structure...
                    </p>
                    <div className="space-y-2">
                        {accounts.map((account) => (
                            <div key={account.username} className="flex items-center justify-between text-sm">
                                <span className="text-blue-800 dark:text-blue-300 font-medium">
                                    {getStatusIcon(migrationStatus[account.username])} {account.username}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                        All accounts will be available on:
                    </p>
                    <ul className="space-y-1 text-sm text-green-800 dark:text-green-300">
                        <li>✓ Rubix Mainnet</li>
                        <li>✓ Rubix Testnet</li>
                    </ul>
                </div>

                {!migrating ? (
                    <button
                        onClick={handleMigrate}
                        className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        Start Migration
                    </button>
                ) : (
                    <button
                        disabled
                        className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-semibold py-3 px-4 rounded-lg cursor-not-allowed flex items-center justify-center"
                    >
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating... Please wait
                    </button>
                )}

                {progress && (
                    <p className="text-center text-xs text-quinary dark:text-gray-500 mt-4">
                        {progress.totalAccounts} account(s) to migrate
                    </p>
                )}
            </div>
        </div>
    );
}
