import { useState, useEffect, useCallback } from 'react';
import { config, getConfigPromise } from '../../config';
import { generateSignature } from '../utils';
import indexDBUtil from '../indexDB';
import axios from 'axios';

const NETWORKS = [
    { id: '1', name: 'RUBIX_MAINNET', baseUrlKey: 'RUBIX_MAINNET_BASE_URL' },
    { id: '2', name: 'RUBIX_TESTNET', baseUrlKey: 'RUBIX_TESTNET_BASE_URL' },
    { id: '3', name: 'TRIE_TESTNET', baseUrlKey: 'TRIE_TESTNET_BASE_URL' },
    { id: '4', name: 'TRIE_MAINNET', baseUrlKey: 'TRIE_MAINNET_BASE_URL' }
];

const useNetworkRegistrationCheck = (userDetails) => {
    const [isChecking, setIsChecking] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState(null);
    const unifiedPassword = userDetails?.pin;

    const checkAndRegisterDID = useCallback(async () => {
        if (!userDetails?.did || !userDetails?.username || !unifiedPassword) {
            return;
        }

        try {
            const alreadyVerified = await indexDBUtil.isNetworkRegistrationVerified(userDetails.username);
            if (alreadyVerified) {
                return;
            }

            setIsChecking(true);
            await getConfigPromise();

            const accountData = await indexDBUtil.getDecryptedAccountData(userDetails.username, unifiedPassword);
            if (!accountData?.status || !accountData?.privateKey) {
                setIsChecking(false);
                return;
            }

            const privateKeyHex = accountData.privateKey;
            const publicKey = userDetails.publickey;
            const did = userDetails.did;

            const registrationResults = [];

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
                        registrationResults.push({ network: network.id, status: 'already_registered' });
                        continue;
                    }

                    let didResponse = await networkApi.post('/request-did-for-pubkey', {
                        public_key: publicKey,
                        network: network.id
                    });
                    didResponse = didResponse.data;

                    if (!didResponse?.did) {
                        registrationResults.push({ network: network.id, status: 'failed', error: 'No DID returned' });
                        continue;
                    }

                    let registerResponse = await networkApi.post('/register-did', { did: didResponse.did });
                    registerResponse = registerResponse.data;

                    if (!registerResponse?.status || !registerResponse?.result?.hash) {
                        registrationResults.push({ network: network.id, status: 'failed', error: 'Registration failed' });
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
                        registrationResults.push({ network: network.id, status: 'registered' });
                    } else {
                        registrationResults.push({ network: network.id, status: 'failed', error: 'Signature failed' });
                    }
                } catch (error) {
                    registrationResults.push({ network: network.id, status: 'failed', error: error.message });
                }
            }

            setRegistrationStatus(registrationResults);

            const allSuccessful = registrationResults.every(
                r => r.status === 'already_registered' || r.status === 'registered'
            );

            if (allSuccessful) {
                await indexDBUtil.setNetworkRegistrationVerified(userDetails.username);
            }
        } catch (error) {
        } finally {
            setIsChecking(false);
        }
    }, [userDetails?.did, userDetails?.username, userDetails?.publickey, unifiedPassword]);

    useEffect(() => {
        checkAndRegisterDID();
    }, [checkAndRegisterDID]);

    return { isChecking, registrationStatus };
};

export default useNetworkRegistrationCheck;
