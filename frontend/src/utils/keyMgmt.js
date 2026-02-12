//convert password into a cryptographic key
export async function deriveWrappingKeyFromPassword(password, saltB64) {
    //get salt
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));

    //get keyMaterial
    const keyMaterial = await crypto.subtle.importKey(
        "raw",                               //raw bytes
        new TextEncoder().encode(password),  //encode as UTF-8
        "PBKDF2",
        false,                               //not exportable
        ["deriveKey"]                        //only for deriving keys
    );

    //get key
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },    //AES-GCM 256-bit long key
        true,                                //exportable
        ["wrapKey", "unwrapKey"]             //used for wrapping/unwrapping keys
    );
}

//wrap master key to store on server
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

//unwrap master key
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
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}