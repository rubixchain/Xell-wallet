import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import secp256k1 from 'secp256k1';
// ECIES encryption commented out - using direct transfer instead
// import { encryptForProxy, getProxyPublicKey } from './ecies';
import { generateSignature } from '../utils';

const bip32 = BIP32Factory(ecc);

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
    const privateKeyHex = privateKeyBuffer.toString('hex');
    const compressedPublicKey = generateCompressedPublicKey(privateKeyBuffer);
    const uncompressedPublicKey = generateUncompressedPublicKey(privateKeyBuffer);

    const legacyPrivateKeyBuffer = derivePrivateKeyFromMnemonicLegacy(mnemonic);
    const legacyPrivateKeyHex = legacyPrivateKeyBuffer.toString('hex');
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

// ECIES encryption commented out - using direct transfer instead
// export async function encryptPrivateKeyForProxy(privateKeyHex) {
//     return encryptForProxy(privateKeyHex);
// }

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
        console.log('Transfer initiation response:', response);

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
        console.error('Migration transfer error:', error);
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Failed to initiate migration transfer',
            error
        };
    }
}

// Legacy proxy transfer function - kept for backwards compatibility but commented out
// export async function initiateProxyTransfer(privateKeyHex, senderDid, receiverDid) {
//     try {
//         const { END_POINTS } = await import('../api/endpoints');
//         const encryptedPK = await encryptForProxy(privateKeyHex);
//
//         const response = await END_POINTS.initiate_proxy_rbt_transfer({
//             encryptedpK: encryptedPK,
//             sender: senderDid,
//             receiver: receiverDid,
//             operation_type: 20
//         });
//         console.log('response', response);
//
//         return {
//             success: response?.status ?? true,
//             message: response?.message || 'Proxy transfer completed successfully',
//             data: response
//         };
//     } catch (error) {
//         return {
//             success: false,
//             message: error?.response?.data?.message || error?.message || 'Failed to initiate proxy transfer',
//             error
//         };
//     }
// }

// ECIES exports commented out - not needed for direct transfer
// export { encryptForProxy, getProxyPublicKey };
