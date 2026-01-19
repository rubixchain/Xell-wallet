import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import secp256k1 from 'secp256k1';
import { encryptForProxy, getProxyPublicKey } from './ecies';
import { generateSignature } from '../utils';

const bip32 = BIP32Factory(ecc);

function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

export const MIGRATION_VERSIONS = {
    PRE_MIGRATION: 4,
    UNIFIED_PASSWORD_DONE: 5,
    FULLY_MIGRATED: 6
};

export const ACCOUNT_MIGRATION_STATUS = {
    PENDING: 'pending',
    VALIDATED: 'validated',
    SKIPPED: 'skipped',
    MIGRATED: 'migrated',
    FAILED: 'failed'
};

export function derivePrivateKeyFromMnemonic(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath("m/0");
    return child.privateKey;
}

export function derivePrivateKeyFromMnemonicLegacy(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    return seed.slice(0, 32);
}

export function generateCompressedPublicKey(privateKey) {
    const privateKeyBuffer = Buffer.isBuffer(privateKey)
        ? privateKey
        : Buffer.from(privateKey, 'hex');

    if (!secp256k1.privateKeyVerify(privateKeyBuffer)) {
        throw new Error('Invalid private key');
    }

    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer, true);
    return Buffer.from(publicKeyBuffer).toString('hex');
}

export function generateUncompressedPublicKey(privateKey) {
    const privateKeyBuffer = Buffer.isBuffer(privateKey)
        ? privateKey
        : Buffer.from(privateKey, 'hex');

    if (!secp256k1.privateKeyVerify(privateKeyBuffer)) {
        throw new Error('Invalid private key');
    }

    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer, false);
    return Buffer.from(publicKeyBuffer).toString('hex');
}

export function deriveKeysFromMnemonic(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }

    const privateKeyBuffer = derivePrivateKeyFromMnemonic(mnemonic);
    const privateKeyHex = uint8ArrayToHex(privateKeyBuffer);
    const compressedPublicKey = generateCompressedPublicKey(privateKeyBuffer);
    const uncompressedPublicKey = generateUncompressedPublicKey(privateKeyBuffer);

    const legacyPrivateKeyBuffer = derivePrivateKeyFromMnemonicLegacy(mnemonic);
    const legacyPrivateKeyHex = uint8ArrayToHex(legacyPrivateKeyBuffer);
    const legacyCompressedPublicKey = generateCompressedPublicKey(legacyPrivateKeyBuffer);
    const legacyUncompressedPublicKey = generateUncompressedPublicKey(legacyPrivateKeyBuffer);

    if (compressedPublicKey.length !== 66) {
        throw new Error('Invalid compressed public key length');
    }
    if (uncompressedPublicKey.length !== 130) {
        throw new Error('Invalid uncompressed public key length');
    }

    return {
        privateKey: privateKeyHex,
        privateKeyBuffer,
        compressedPublicKey,
        uncompressedPublicKey,
        legacyPrivateKey: legacyPrivateKeyHex,
        legacyPrivateKeyBuffer,
        legacyCompressedPublicKey,
        legacyUncompressedPublicKey
    };
}

export function matchMnemonicToAccount(mnemonic, accounts) {
    try {
        const { compressedPublicKey } = deriveKeysFromMnemonic(mnemonic);
        const matchedAccount = accounts.find(account => account.publickey === compressedPublicKey);
        return matchedAccount || null;
    } catch (error) {
        return null;
    }
}

export function validateMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
        return false;
    }

    const trimmed = mnemonic.trim();
    const words = trimmed.split(/\s+/);

    if (words.length !== 24) {
        return false;
    }

    return bip39.validateMnemonic(trimmed);
}

export function checkMigrationRequired(version) {
    const versionNum = parseInt(version) || 0;

    return {
        needsUnifiedPassword: versionNum <= MIGRATION_VERSIONS.PRE_MIGRATION,
        needsDIDMigration: versionNum === MIGRATION_VERSIONS.UNIFIED_PASSWORD_DONE,
        isFullyMigrated: versionNum >= MIGRATION_VERSIONS.FULLY_MIGRATED
    };
}

export function validatePINForAccount(encryptedPrivateKey, pin, CryptoJS) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, pin);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (decrypted && decrypted.length > 0) {
            return { valid: true, decryptedKey: decrypted };
        }
        return { valid: false, decryptedKey: null };
    } catch (error) {
        return { valid: false, decryptedKey: null };
    }
}

export function decryptMnemonic(encryptedMnemonic, pin, CryptoJS) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedMnemonic, pin);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (decrypted && validateMnemonic(decrypted)) {
            return { valid: true, mnemonic: decrypted };
        }
        return { valid: false, mnemonic: null };
    } catch (error) {
        return { valid: false, mnemonic: null };
    }
}

export async function encryptPrivateKeyForProxy(privateKeyHex) {
    return encryptForProxy(privateKeyHex);
}

/**
 * Handle recursive signature flow for RBT transfer
 * @param {string} id - Transaction ID from Rubix node
 * @param {string} hash - Hash to sign
 * @param {string} privateKeyHex - Private key in hex format
 * @param {Object} END_POINTS - API endpoints
 * @returns {Promise<Object>}
 */
async function handleSignatureFlow(id, hash, privateKeyHex, END_POINTS) {
    const signature = await generateSignature(privateKeyHex, hash);

    const signatureResponse = await END_POINTS.signature_response({
        id,
        mode: 4,
        Signature: { Signature: signature }
    });

    // Check if more signatures are needed (recursive)
    if (signatureResponse?.status && signatureResponse?.result?.hash) {
        return handleSignatureFlow(
            signatureResponse.result.id,
            signatureResponse.result.hash,
            privateKeyHex,
            END_POINTS
        );
    }

    return signatureResponse;
}

/**
 * Initiate direct RBT transfer for DID migration (no proxy needed)
 * @param {string} privateKeyHex - Legacy private key in hex format
 * @param {string} senderDid - Old DID (sender)
 * @param {string} receiverDid - New DID (receiver)
 * @param {number} tokenCount - Amount to transfer (full balance)
 * @returns {Promise<Object>}
 */
export async function initiateMigrationTransfer(privateKeyHex, senderDid, receiverDid, tokenCount) {
    try {
        const { END_POINTS } = await import('../api/endpoints');

        // Call initiate-rbt-transfer directly
        const response = await END_POINTS.transfer_rtbt({
            sender: senderDid,
            receiver: receiverDid,
            tokenCount: tokenCount,
            type: 2
        });

        // Check if signature is required
        if (response?.status && response?.result?.hash) {
            // Handle signature flow with legacy private key
            const finalResponse = await handleSignatureFlow(
                response.result.id,
                response.result.hash,
                privateKeyHex,
                END_POINTS
            );

            return {
                success: finalResponse?.status ?? false,
                message: finalResponse?.message || 'Migration transfer completed',
                data: finalResponse
            };
        }

        // No signature needed or transfer failed
        return {
            success: response?.status ?? false,
            message: response?.message || 'Transfer initiated',
            data: response
        };
    } catch (error) {
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Failed to initiate migration transfer',
            error
        };
    }
}

/**
 * Initiate proxy transfer for DID migration (with ECIES encryption)
 * @param {string} privateKeyHex - Legacy private key in hex format
 * @param {string} senderDid - Old DID (sender)
 * @param {string} receiverDid - New DID (receiver)
 * @param {string} networkBaseUrl - Base URL of the network to transfer from
 * @returns {Promise<Object>}
 */
export async function initiateProxyTransfer(privateKeyHex, senderDid, receiverDid, networkBaseUrl) {
    try {
        if (!networkBaseUrl) {
            return {
                success: false,
                message: 'Network base URL is not configured'
            };
        }

        const axios = (await import('axios')).default;

        const encryptedPK = await encryptForProxy(privateKeyHex);

        const requestPayload = {
            encryptedpK: encryptedPK,
            sender: senderDid,
            receiver: receiverDid,
            operation_type: 20
        };

        const response = await axios.post(`${networkBaseUrl}/initiate-proxy-rbt-transfer`, requestPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 600000
        });

        return {
            success: response?.data?.status ?? false,
            message: response?.data?.message || 'Proxy transfer completed successfully',
            data: response?.data,
            finalBalance: response?.data?.finalBalance ?? null,
            transferCount: response?.data?.transferCount ?? 0
        };
    } catch (error) {
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Failed to initiate proxy transfer',
            error
        };
    }
}

export async function removeOldDid(oldDid, privateKeyHex, networkBaseUrl) {
    try {
        if (!networkBaseUrl || !oldDid) {
            return { success: false, message: 'Missing network URL or DID' };
        }

        const axios = (await import('axios')).default;
        const { generateSignature } = await import('../utils');

        const networkApi = axios.create({
            baseURL: networkBaseUrl,
            headers: { 'Content-Type': 'application/json' }
        });

        const removeResponse = await networkApi.post('/remove-did', { did: oldDid });

        if (!removeResponse?.data?.status || !removeResponse?.data?.result?.hash) {
            return {
                success: false,
                message: removeResponse?.data?.message || 'Failed to initiate DID removal'
            };
        }

        const signature = await generateSignature(privateKeyHex, removeResponse.data.result.hash);
        const signatureResponse = await networkApi.post('/signature-response', {
            id: removeResponse.data.result.id,
            Signature: { Signature: signature },
            mode: 4
        });

        return {
            success: signatureResponse?.data?.status ?? false,
            message: signatureResponse?.data?.message || 'DID removed successfully'
        };
    } catch (error) {
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Failed to remove old DID'
        };
    }
}

export { encryptForProxy, getProxyPublicKey };
