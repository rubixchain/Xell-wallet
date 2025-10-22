import { END_POINTS } from "../api/endpoints";
import indexDBUtil from "./index";
import { config } from "../../config";
import toast from "react-hot-toast";

/**
 * Migrate accounts from old structure (v3.x) to new network structure (v4.0)
 * All accounts will be registered on both Rubix Mainnet and Rubix Testnet default nodes
 */
export async function migrateToNetworkStructure() {
    try {
        const db = await indexDBUtil.initDB();

        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction([indexDBUtil.storeName], 'readonly');
            const store = transaction.objectStore(indexDBUtil.storeName);
            const request = store.get('UserDetails');

            request.onsuccess = async () => {
                const data = request.result;
                if (!data || !data.accounts || data.accounts.length === 0) {
                    resolve({ status: false, message: 'No accounts to migrate' });
                    return;
                }

                try {
                    const oldAccounts = data.accounts;
                    const rubixMainnetUrl = config.RUBIX_MAINNET_BASE_URL;
                    const rubixTestnetUrl = config.RUBIX_TESTNET_BASE_URL;

                    if (!rubixMainnetUrl || !rubixTestnetUrl) {
                        throw new Error('Network URLs not configured');
                    }

                    const migrationResults = {
                        success: [],
                        failed: [],
                        total: oldAccounts.length
                    };

                    for (const account of oldAccounts) {
                        try {
                            let mainnetSuccess = false;
                            let testnetSuccess = false;

                            try {
                                await END_POINTS.register_did({ did: account.did });
                                mainnetSuccess = true;

                                await indexDBUtil.saveAccountNetworkBinding({
                                    username: account.username,
                                    did: account.did,
                                    networkId: 1,
                                    nodeId: 1,
                                    nodeUrl: rubixMainnetUrl,
                                    swarmKey: "RUBIX_MAINNET_SWARM_KEY"
                                });
                            } catch (error) {
                                mainnetSuccess = false;
                            }

                            try {
                                await END_POINTS.register_did({ did: account.did });
                                testnetSuccess = true;

                                await indexDBUtil.saveAccountNetworkBinding({
                                    username: account.username,
                                    did: account.did,
                                    networkId: 2,
                                    nodeId: 1,
                                    nodeUrl: rubixTestnetUrl,
                                    swarmKey: "RUBIX_TESTNET_SWARM_KEY"
                                });
                            } catch (error) {
                                testnetSuccess = false;
                            }

                            if (mainnetSuccess || testnetSuccess) {
                                migrationResults.success.push(account.username);
                            } else {
                                migrationResults.failed.push(account.username);
                            }
                        } catch (error) {
                            migrationResults.failed.push(account.username);
                        }
                    }

                    await indexDBUtil.setStorageVersion('4.0');

                    if (migrationResults.failed.length > 0) {
                        toast.error(`Failed to migrate ${migrationResults.failed.length} account(s)`);
                    }

                    resolve({
                        status: true,
                        message: `Successfully migrated ${migrationResults.success.length} of ${migrationResults.total} accounts`,
                        results: migrationResults
                    });
                } catch (error) {
                    reject(error);
                }
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        throw error;
    }
}

export async function getMigrationProgress() {
    try {
        const accounts = await indexDBUtil.getAllAccountsForMigration();
        const version = await indexDBUtil.getStorageVersion();

        return {
            totalAccounts: accounts.length,
            needsMigration: parseFloat(version) < 4.0 && accounts.length > 0,
            currentVersion: version
        };
    } catch (error) {
        return {
            totalAccounts: 0,
            needsMigration: false,
            currentVersion: '3.0'
        };
    }
}
