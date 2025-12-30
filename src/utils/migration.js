import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import secp256k1 from 'secp256k1';
import { encryptForProxy, getProxyPublicKey } from './ecies';

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

export async function encryptPrivateKeyForProxy(privateKeyHex) {
    return encryptForProxy(privateKeyHex);
}

export async function initiateProxyTransfer(privateKeyHex, senderDid, receiverDid) {
    try {
        const { END_POINTS } = await import('../api/endpoints');
        const encryptedPK = await encryptForProxy(privateKeyHex);

        const response = await END_POINTS.initiate_proxy_rbt_transfer({
            encryptedpK: encryptedPK,
            sender: senderDid,
            receiver: receiverDid,
            operation_type: 20
        });

        return {
            success: response?.status ?? true,
            message: response?.message || 'Proxy transfer completed successfully',
            data: response
        };
    } catch (error) {
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Failed to initiate proxy transfer',
            error
        };
    }
}

export { encryptForProxy, getProxyPublicKey };
