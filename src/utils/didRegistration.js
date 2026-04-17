import axios from 'axios';
import { generateSignature } from '../utils';
import { getRegistrationNetworks } from './networkConfig';

export const registerDIDOnNetwork = async (network, publicKey, privateKey, password) => {
    try {
        const customApi = axios.create({
            baseURL: network.baseUrl,
            headers: { 'Content-Type': 'application/json' }
        });

        let didResponse = await customApi.post('/rubix/v1/dids/create', {
            public_key: publicKey,
            password: password
        });
        didResponse = didResponse.data;

        if (!didResponse || !didResponse.result?.did) {
            return null;
        }

        const newDid = didResponse.result.did;

        let registerResponse = await customApi.get(`/rubix/v1/dids/${newDid}/register`);
        registerResponse = registerResponse.data;

        if (!registerResponse || !registerResponse.status) {
            return null;
        }

        const signature = await generateSignature(privateKey, registerResponse.result.hash);
        let signatureResponse = await customApi.post('/rubix/v1/signature', {
            id: registerResponse.result.id,
            signature: signature
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

export const registerDIDOnAllNetworks = async (publicKey, privateKey, password) => {
    const networks = getRegistrationNetworks();

    const registrationPromises = networks.map(network =>
        registerDIDOnNetwork(network, publicKey, privateKey, password)
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

export const registerExistingDIDOnNetwork = async (network, did, privateKey) => {
    try {
        const customApi = axios.create({
            baseURL: network.baseUrl,
            headers: { 'Content-Type': 'application/json' }
        });

        let registerResponse = await customApi.get(`/rubix/v1/dids/${did}/register`);
        registerResponse = registerResponse.data;

        if (!registerResponse || !registerResponse.status) {
            return null;
        }

        const signature = await generateSignature(privateKey, registerResponse.result.hash);
        let signatureResponse = await customApi.post('/rubix/v1/signature', {
            id: registerResponse.result.id,
            signature: signature
        });
        signatureResponse = signatureResponse.data;

        if (!signatureResponse || !signatureResponse.status) {
            return null;
        }

        return {
            network: network.id,
            did: did,
            status: true,
            baseUrl: network.baseUrl
        };
    } catch (error) {
        return null;
    }
};

export const registerExistingDIDOnAllNetworks = async (did, privateKey) => {
    const networks = getRegistrationNetworks();

    const registrationPromises = networks.map(network =>
        registerExistingDIDOnNetwork(network, did, privateKey)
    );

    const registrationResults = await Promise.all(registrationPromises);
    const successfulRegistrations = registrationResults.filter(result => result !== null);

    return {
        did: did,
        registrations: successfulRegistrations,
        successCount: successfulRegistrations.length
    };
};
