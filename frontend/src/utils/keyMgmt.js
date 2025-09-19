export async function deriveWrappingKeyFromPassword(password, saltB64) {
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["wrapKey", "unwrapKey"]
    );
}

export async function wrapMasterKey(masterKey, password, salt) {
    const saltB64 = btoa(String.fromCharCode(...salt));
    const wrappingKey = await deriveWrappingKeyFromPassword(password, saltB64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.wrapKey("raw", masterKey, wrappingKey, {
        name: "AES-GCM",
        iv,
    });

    return {
        wrappedMasterKeyB64: btoa(String.fromCharCode(...new Uint8Array(wrapped))),
        ivB64: btoa(String.fromCharCode(...iv)),
        saltB64,
    };
}

export async function unwrapMasterKey(wrappedMasterKeyB64, ivB64, wrappingKey) {
    const wrapped = Uint8Array.from(atob(wrappedMasterKeyB64), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    return crypto.subtle.unwrapKey(
        "raw",
        wrapped,
        wrappingKey,
        { name: "AES-GCM", iv },
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}