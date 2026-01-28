import axios from 'axios';
import { generateSignature } from '../utils';
import { getRegistrationNetworks } from './networkConfig';

export const registerDIDOnNetwork = async (network, publicKey, privateKey) => {
    try {
        const customApi = axios.create({
            baseURL: network.baseUrl,
            headers: { 'Content-Type': 'application/json' }
        });

        let didResponse = await customApi.post('/request-did-for-pubkey', {
            public_key: publicKey,
            network: network.id
        });
        didResponse = didResponse.data;

        if (!didResponse || !didResponse.did) {
            return null;
        }

        const newDid = didResponse.did;

        let registerResponse = await customApi.post('/register-did', { did: newDid });
        registerResponse = registerResponse.data;

        if (!registerResponse || !registerResponse.status) {
            return null;
        }

        const signature = await generateSignature(privateKey, registerResponse.result.hash);
        let signatureResponse = await customApi.post('/signature-response', {
            id: registerResponse.result.id,
            Signature: { Signature: signature },
            mode: 4
        });
        signatureResponse = signatureResponse.data;

        if (!signatureResponse || !signatureResponse.status) {
            return null;
        }

        return {
            network: network.id,
            did: newDid,
            status: true,
            baseUrl: network.baseUrl
        };
    } catch (error) {
        return null;
    }
};

export const registerDIDOnAllNetworks = async (publicKey, privateKey) => {
    const networks = getRegistrationNetworks();

    const registrationPromises = networks.map(network =>
        registerDIDOnNetwork(network, publicKey, privateKey)
    );

    const registrationResults = await Promise.all(registrationPromises);
    const successfulRegistrations = registrationResults.filter(result => result !== null);

    if (successfulRegistrations.length === 0) {
        throw new Error('Failed to register new DID on any network');
    }

    return {
        primaryDid: successfulRegistrations[0].did,
        registrations: successfulRegistrations
    };
};
