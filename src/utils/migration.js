import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import secp256k1 from 'secp256k1';

// Initialize BIP32 with elliptic curve implementation
const bip32 = BIP32Factory(ecc);

// Migration version constants
export const MIGRATION_VERSIONS = {
    PRE_MIGRATION: 4,           // Before any migration
    UNIFIED_PASSWORD_DONE: 5,   // Unified password set, DID migration pending
    FULLY_MIGRATED: 6           // All migrations complete
};

// Migration status for accounts
export const ACCOUNT_MIGRATION_STATUS = {
    PENDING: 'pending',
    VALIDATED: 'validated',     // PIN validated or mnemonic imported
    SKIPPED: 'skipped',
    MIGRATED: 'migrated',
    FAILED: 'failed'
};

/**
 * Derive private key from mnemonic using BIP32 path m/0
 * @param {string} mnemonic - 24-word recovery phrase
 * @returns {Buffer} - Private key buffer
 */
export function derivePrivateKeyFromMnemonic(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath("m/0");
    return child.privateKey;
}

/**
 * Derive private key from mnemonic using OLD method (pre-BIP32)
 * This is for accounts created before the BIP32 derivation fix
 * @param {string} mnemonic - 24-word recovery phrase
 * @returns {Buffer} - Private key buffer (first 32 bytes of seed)
 */
export function derivePrivateKeyFromMnemonicLegacy(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    return seed.slice(0, 32);
}

/**
 * Generate compressed public key (66 hex chars) - OLD format
 * Used for matching existing accounts
 * @param {Buffer|string} privateKey - Private key as buffer or hex string
 * @returns {string} - Compressed public key (66 hex chars)
 */
export function generateCompressedPublicKey(privateKey) {
    const privateKeyBuffer = Buffer.isBuffer(privateKey)
        ? privateKey
        : Buffer.from(privateKey, 'hex');

    if (!secp256k1.privateKeyVerify(privateKeyBuffer)) {
        throw new Error('Invalid private key');
    }

    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer, true); // true = compressed
    return Buffer.from(publicKeyBuffer).toString('hex');
}

/**
 * Generate uncompressed public key (130 hex chars) - NEW format
 * Used for generating new DIDs
 * @param {Buffer|string} privateKey - Private key as buffer or hex string
 * @returns {string} - Uncompressed public key (130 hex chars)
 */
export function generateUncompressedPublicKey(privateKey) {
    const privateKeyBuffer = Buffer.isBuffer(privateKey)
        ? privateKey
        : Buffer.from(privateKey, 'hex');

    if (!secp256k1.privateKeyVerify(privateKeyBuffer)) {
        throw new Error('Invalid private key');
    }

    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer, false); // false = uncompressed
    return Buffer.from(publicKeyBuffer).toString('hex');
}

/**
 * Derive all keys from mnemonic (tries both BIP32 and legacy methods)
 * @param {string} mnemonic - 24-word recovery phrase
 * @returns {Object} - { privateKey, compressedPublicKey, uncompressedPublicKey, legacy versions }
 */
export function deriveKeysFromMnemonic(mnemonic) {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }

    // NEW METHOD: BIP32 derivation (m/0)
    const privateKeyBuffer = derivePrivateKeyFromMnemonic(mnemonic);
    const privateKeyHex = privateKeyBuffer.toString('hex');
    const compressedPublicKey = generateCompressedPublicKey(privateKeyBuffer);
    const uncompressedPublicKey = generateUncompressedPublicKey(privateKeyBuffer);

    // OLD METHOD: Legacy derivation (first 32 bytes of seed)
    const legacyPrivateKeyBuffer = derivePrivateKeyFromMnemonicLegacy(mnemonic);
    const legacyPrivateKeyHex = legacyPrivateKeyBuffer.toString('hex');
    const legacyCompressedPublicKey = generateCompressedPublicKey(legacyPrivateKeyBuffer);
    const legacyUncompressedPublicKey = generateUncompressedPublicKey(legacyPrivateKeyBuffer);

    // Validate key lengths
    if (compressedPublicKey.length !== 66) {
        throw new Error('Invalid compressed public key length');
    }
    if (uncompressedPublicKey.length !== 130) {
        throw new Error('Invalid uncompressed public key length');
    }

    return {
        // NEW BIP32 method
        privateKey: privateKeyHex,
        privateKeyBuffer,
        compressedPublicKey,
        uncompressedPublicKey,
        // OLD legacy method
        legacyPrivateKey: legacyPrivateKeyHex,
        legacyPrivateKeyBuffer,
        legacyCompressedPublicKey,
        legacyUncompressedPublicKey
    };
}

/**
 * Match a mnemonic to an existing account by comparing compressed public keys
 * @param {string} mnemonic - 24-word recovery phrase
 * @param {Array} accounts - Array of account objects with publickey field
 * @returns {Object|null} - Matched account or null
 */
export function matchMnemonicToAccount(mnemonic, accounts) {
    try {
        const { compressedPublicKey } = deriveKeysFromMnemonic(mnemonic);

        // Find account with matching public key
        const matchedAccount = accounts.find(account => {
            // Account might have compressed (66) or uncompressed (130) public key
            // We compare with compressed version
            return account.publickey === compressedPublicKey;
        });

        return matchedAccount || null;
    } catch (error) {
        return null;
    }
}

/**
 * Validate mnemonic format
 * @param {string} mnemonic - Recovery phrase to validate
 * @returns {boolean} - True if valid
 */
export function validateMnemonic(mnemonic) {
    if (!mnemonic || typeof mnemonic !== 'string') {
        return false;
    }

    const trimmed = mnemonic.trim();
    const words = trimmed.split(/\s+/);

    // Must be 24 words
    if (words.length !== 24) {
        return false;
    }

    // Use bip39 validation
    return bip39.validateMnemonic(trimmed);
}

/**
 * Check if migration is required based on version
 * @param {number} version - Current version
 * @returns {Object} - { needsUnifiedPassword, needsDIDMigration }
 */
export function checkMigrationRequired(version) {
    const versionNum = parseInt(version) || 0;

    return {
        needsUnifiedPassword: versionNum <= MIGRATION_VERSIONS.PRE_MIGRATION,
        needsDIDMigration: versionNum === MIGRATION_VERSIONS.UNIFIED_PASSWORD_DONE,
        isFullyMigrated: versionNum >= MIGRATION_VERSIONS.FULLY_MIGRATED
    };
}

/**
 * Validate PIN by attempting to decrypt private key
 * @param {string} encryptedPrivateKey - AES encrypted private key
 * @param {string} pin - PIN to validate
 * @param {Object} CryptoJS - CryptoJS library instance
 * @returns {Object} - { valid: boolean, decryptedKey: string|null }
 */
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

/**
 * Validate PIN and decrypt mnemonic
 * @param {string} encryptedMnemonic - AES encrypted mnemonic
 * @param {string} pin - PIN to validate
 * @param {Object} CryptoJS - CryptoJS library instance
 * @returns {Object} - { valid: boolean, mnemonic: string|null }
 */
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
