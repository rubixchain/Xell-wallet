import secp256k1 from 'secp256k1';

const PROXY_PUBLIC_KEY = '042719da6beec04e93a511bc57c1b2769e646c2d18cb7130af90295e9617b5bdfd6729987de247e9c57467ec4219f73f736ca3259605e6fb859c16a707d98a6546';

function hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function getRandomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

async function deriveEncryptionKey(sharedSecret) {
    const encoder = new TextEncoder();
    const salt = encoder.encode('ecies-salt');

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        salt,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const derivedKeyBuffer = await crypto.subtle.sign(
        'HMAC',
        keyMaterial,
        sharedSecret
    );

    return new Uint8Array(derivedKeyBuffer);
}

async function aesGcmEncrypt(key, iv, plaintext) {
    const aesKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        aesKey,
        plaintext
    );

    const encrypted = new Uint8Array(encryptedBuffer);
    const ciphertext = encrypted.slice(0, encrypted.length - 16);
    const authTag = encrypted.slice(encrypted.length - 16);

    return { ciphertext, authTag };
}

export async function encryptForProxy(privateKeyHex, recipientPublicKeyHex = PROXY_PUBLIC_KEY) {
    let ephemeralPrivateKey;
    do {
        ephemeralPrivateKey = getRandomBytes(32);
    } while (!secp256k1.privateKeyVerify(ephemeralPrivateKey));

    const ephemeralPublicKey = secp256k1.publicKeyCreate(ephemeralPrivateKey, false);
    const recipientPublicKey = hexToUint8Array(recipientPublicKeyHex);
    const sharedSecret = secp256k1.ecdh(recipientPublicKey, ephemeralPrivateKey);
    const encryptionKey = await deriveEncryptionKey(sharedSecret);
    const iv = getRandomBytes(16);
    const plaintext = hexToUint8Array(privateKeyHex);
    const { ciphertext, authTag } = await aesGcmEncrypt(encryptionKey, iv, plaintext);

    const totalLength = ephemeralPublicKey.length + iv.length + authTag.length + ciphertext.length;
    const result = new Uint8Array(totalLength);

    let offset = 0;
    result.set(ephemeralPublicKey, offset);
    offset += ephemeralPublicKey.length;
    result.set(iv, offset);
    offset += iv.length;
    result.set(authTag, offset);
    offset += authTag.length;
    result.set(ciphertext, offset);

    return uint8ArrayToHex(result);
}

export function getProxyPublicKey() {
    return PROXY_PUBLIC_KEY;
}

export default { encryptForProxy, getProxyPublicKey };
