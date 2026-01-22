import { useState, useCallback } from 'react';
import { config, getConfigPromise } from '../../config';
import { generateSignature } from '../utils';
import indexDBUtil from '../indexDB';
import axios from 'axios';
import toast from 'react-hot-toast';

const NETWORKS = [
    { id: '1', name: 'Rubix Mainnet', baseUrlKey: 'RUBIX_MAINNET_BASE_URL' },
    { id: '2', name: 'Rubix Testnet', baseUrlKey: 'RUBIX_TESTNET_BASE_URL' },
    { id: '3', name: 'Trie Testnet', baseUrlKey: 'TRIE_TESTNET_BASE_URL' },
    { id: '4', name: 'Trie Mainnet', baseUrlKey: 'TRIE_MAINNET_BASE_URL' }
];

const useNetworkRegistrationCheck = (userDetails) => {
    const [isChecking, setIsChecking] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState(null);
    const unifiedPassword = userDetails?.pin;

    const refreshDID = useCallback(async () => {
        if (!userDetails?.did || !userDetails?.username || !unifiedPassword) {
            toast.error('User details not available');
            return { success: false };
        }

        try {
            setIsChecking(true);
            setRegistrationStatus(null);
            await getConfigPromise();

            const accountData = await indexDBUtil.getDecryptedAccountData(userDetails.username, unifiedPassword);
            if (!accountData?.status || !accountData?.data?.privateKey) {
                toast.error('Failed to get account data');
                setIsChecking(false);
                return { success: false };
            }

            const privateKeyHex = accountData.data.privateKey;
            const publicKey = userDetails.publickey;
            const did = userDetails.did;

            const registrationResults = [];
            let registeredCount = 0;
            let alreadyRegisteredCount = 0;

            for (const network of NETWORKS) {
                const baseUrl = config[network.baseUrlKey];
                if (!baseUrl) continue;

                try {
                    const networkApi = axios.create({
                        baseURL: baseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const accountInfo = await networkApi.get('/get-account-info', { params: { did } });
                    const isRegistered = accountInfo?.data?.account_info?.length > 0;

                    if (isRegistered) {
                        registrationResults.push({ network: network.id, name: network.name, status: 'already_registered' });
                        alreadyRegisteredCount++;
                        continue;
                    }

                    let didResponse = await networkApi.post('/request-did-for-pubkey', {
                        public_key: publicKey,
                        network: network.id
                    });
                    didResponse = didResponse.data;

                    if (!didResponse?.did) {
                        registrationResults.push({ network: network.id, name: network.name, status: 'failed', error: 'No DID returned' });
                        continue;
                    }

                    let registerResponse = await networkApi.post('/register-did', { did: didResponse.did });
                    registerResponse = registerResponse.data;

                    if (!registerResponse?.status || !registerResponse?.result?.hash) {
                        registrationResults.push({ network: network.id, name: network.name, status: 'failed', error: 'Registration failed' });
                        continue;
                    }

                    const signature = await generateSignature(privateKeyHex, registerResponse.result.hash);
                    let signatureResponse = await networkApi.post('/signature-response', {
                        id: registerResponse.result.id,
                        Signature: { Signature: signature },
                        mode: 4
                    });
                    signatureResponse = signatureResponse.data;

                    if (signatureResponse?.status) {
                        registrationResults.push({ network: network.id, name: network.name, status: 'registered' });
                        registeredCount++;
                    } else {
                        registrationResults.push({ network: network.id, name: network.name, status: 'failed', error: 'Signature failed' });
                    }
                } catch (error) {
                    registrationResults.push({ network: network.id, name: network.name, status: 'failed', error: error.message });
                }
            }

            setRegistrationStatus(registrationResults);

            const allSuccessful = registrationResults.every(
                r => r.status === 'already_registered' || r.status === 'registered'
            );

            if (registeredCount > 0) {
                toast.success(`Registered DID on ${registeredCount} network(s)`);
            } else if (alreadyRegisteredCount === NETWORKS.length) {
                toast.success('DID already registered on all networks');
            } else {
                toast.error('Failed to register on some networks');
            }

            return { success: allSuccessful, results: registrationResults };
        } catch (error) {
            toast.error('Failed to refresh DID');
            return { success: false };
        } finally {
            setIsChecking(false);
        }
    }, [userDetails?.did, userDetails?.username, userDetails?.publickey, unifiedPassword]);

    return { isChecking, registrationStatus, refreshDID };
};

export default useNetworkRegistrationCheck;
