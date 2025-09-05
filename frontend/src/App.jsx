import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
    //useState used to make React update the UI everytime an update happens
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [decryptKey, setDecryptKey] = useState("");

    //fetch list of uploaded files
    useEffect(() => {
        axios
            .get("http://localhost:5000/files")
            .then((res) => setFileList(res.data))
            .catch((err) => console.error(err));
    }, []);

    //setSelectedFile to the first file that is uploaded
    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    //encrypt file using AES-GCM
    const encryptFile = async (file) => {
        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },  //256 bits of key
            true,
            ["encrypt", "decrypt"]
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));  //12 bytes of random data
        const data = new Uint8Array(await file.arrayBuffer());
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

        const exportedKey = await crypto.subtle.exportKey("raw", key);
        const keyHex = Array.from(new Uint8Array(exportedKey))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        console.log("Encryption key (keep this safe):", keyHex);
        return { encryptedData: new Blob([iv, new Uint8Array(encrypted)]), keyHex };
    };

    const handleUpload = async () => {
        if (!selectedFile) return alert("Please select a file");
        try {
            const { encryptedData } = await encryptFile(selectedFile);
            const formData = new FormData();
            formData.append("file", encryptedData, selectedFile.name + ".enc");
            await axios.post("http://localhost:5000/upload", formData);
            alert("File encrypted & uploaded");
            //refresh list
            const res = await axios.get("http://localhost:5000/files");
            setFileList(res.data);
            setSelectedFile(null);
        } catch (err) {
            console.error(err);
            alert("Encryption or upload failed");
        }
    };

    const handleDownload = async (filename) => {
        try {
            const response = await axios.get(`http://localhost:5000/download/${filename}`, {
                responseType: "arraybuffer",
            });
            const encryptedData = new Uint8Array(response.data);

            //first 12 bytes are IV
            const iv = encryptedData.slice(0, 12);
            const ciphertext = encryptedData.slice(12);

            const keyBytes = new Uint8Array(
                decryptKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
            );
            const key = await crypto.subtle.importKey(
                "raw",
                keyBytes,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
            const blob = new Blob([decrypted]);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename.replace(".enc", "");
            link.click();
        } catch (err) {
            console.error(err);
            alert("Decryption failed (wrong key?)");
        }
    };

    return (
        <div style={{ padding: 30, fontFamily: "Arial" }}>
            <h2>Secure Drive</h2>

            {/* upload */}
            <div style={{ marginBottom: 20 }}>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleUpload} style={{ marginLeft: 10 }}>
                    Encrypt & Upload
                </button>
            </div>

            {/* download */}
            <div style={{ marginBottom: 20 }}>
                <input
                    type="text"
                    placeholder="Enter key to decrypt"
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                    style={{ width: 300 }}
                />
            </div>

            {/* file list */}
            <h3>Encrypted Files</h3>
            <ul>
                {fileList.map((file, idx) => (
                    <li key={idx}>
                        {file}
                        <button style={{ marginLeft: 10 }} onClick={() => handleDownload(file)}>
                            Download & Decrypt
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;