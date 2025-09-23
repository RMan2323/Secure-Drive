import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DriveLayout from "../components/DriveLayout";
import '../App.css';

function DrivePage() {
    //useState used to make React update the UI everytime an update happens
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [decryptKey, setDecryptKey] = useState("");

    const navigate = useNavigate();

    //fetch list of uploaded files
    useEffect(() => {
        axios.get("http://localhost:5000/files")
            .then((res) => setFileList(res.data))
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        const savedKey = localStorage.getItem("masterKeyB64");
        if (savedKey) {
            const raw = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0));
            crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"])
                .then(key => window.__MASTER_KEY = key);
        }
    }, []);

    //setSelectedFile to the first file that is uploaded
    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    function abToB64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }
    function b64ToUint8(b64) {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }

    //encrypt using per-file CEK and wrap CEK with masterKey
    const handleUpload = async () => {
        if (!selectedFile) return alert("Please select a file");
        try {
            const masterKey = window.__MASTER_KEY;
            if (!masterKey) {
                alert("Missing master key — please log in again");
                throw new Error("No master key");
            }

            //generate CEK (file key)
            const cek = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
            );

            //encrypt file with CEK
            const ivFile = crypto.getRandomValues(new Uint8Array(12));
            const data = new Uint8Array(await selectedFile.arrayBuffer());
            const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivFile }, cek, data);

            //wrap CEK with masterKey
            const wrapIv = crypto.getRandomValues(new Uint8Array(12));
            const wrappedCek = await crypto.subtle.wrapKey("raw", cek, masterKey, { name: "AES-GCM", iv: wrapIv });

            //prepare form data: file bytes (IV + ciphertext) and meta JSON with wrapped CEK + IV
            //and prepend ivFile to ciphertext so server stores IV with ciphertext
            const fileBlob = new Blob([ivFile, new Uint8Array(ciphertext)]);
            const wrappedCekB64 = abToB64(wrappedCek);
            const wrapIvB64 = abToB64(wrapIv.buffer);

            const meta = {
                wrappedCekB64,
                wrapIvB64,
            };

            const formData = new FormData();
            formData.append("file", fileBlob, selectedFile.name + ".enc");
            formData.append("meta", JSON.stringify(meta));

            //upload
            await axios.post("http://localhost:5000/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert("File encrypted & uploaded (CEK wrapped by master key)");
            //refresh list
            const res = await axios.get("http://localhost:5000/files");
            setFileList(res.data);
            setSelectedFile(null);
        } catch (err) {
            console.error(err);
            alert("Encryption or upload failed");
        }
    };

    //download flow: fetch metadata, unwrap CEK, fetch file bytes, decrypt with CEK
    const handleDownload = async (filename) => {
        try {
            const masterKey = window.__MASTER_KEY;
            if (!masterKey) {
                alert("Missing master key — please log in again");
                throw new Error("No master key");
            }

            //fetch metadata for the file (wrapped CEK + wrap IV)
            const metaRes = await axios.get(`http://localhost:5000/api/meta/${encodeURIComponent(filename)}`);
            const { wrappedCekB64, wrapIvB64 } = metaRes.data;
            if (!wrappedCekB64 || !wrapIvB64) throw new Error("Missing file metadata");

            const wrapped = b64ToUint8(wrappedCekB64).buffer;
            const wrapIv = b64ToUint8(wrapIvB64);

            //unwrap CEK using masterKey
            const cek = await crypto.subtle.unwrapKey(
                "raw",
                wrapped,
                masterKey,
                { name: "AES-GCM", iv: wrapIv },
                { name: "AES-GCM", length: 256 },
                true,
                ["decrypt"]
            );

            //fetch encrypted file bytes
            const response = await axios.get(`http://localhost:5000/download/${encodeURIComponent(filename)}`, {
                responseType: "arraybuffer",
            });
            const encryptedData = new Uint8Array(response.data);

            //first 12 bytes are IV
            const ivFile = encryptedData.slice(0, 12);
            const ciphertext = encryptedData.slice(12);

            //decrypt with CEK
            const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivFile }, cek, ciphertext);
            const blob = new Blob([decrypted]);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename.replace(".enc", "");
            link.click();
        } catch (err) {
            console.error(err);
            alert("Decryption failed (user not logged in?)");
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
        try {
            await axios.delete(`http://localhost:5000/delete/${encodeURIComponent(filename)}`);
            alert("File deleted successfully");
            //refresh list
            const res = await axios.get("http://localhost:5000/files");
            setFileList(res.data);
        } catch (err) {
            console.error(err);
            alert("Failed to delete file");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("masterKeyB64");
        window.__MASTER_KEY = null;

        alert("Logged out successfully!");
        navigate("/login");
    };

    return (
        <DriveLayout
            handleFileChange={(e) => setSelectedFile(e.target.files[0])}
            handleUpload={handleUpload}
            decryptKey={decryptKey}
            setDecryptKey={setDecryptKey}
            fileList={fileList}
            handleDownload={handleDownload}
            handleDelete={handleDelete}
            handleLogout={handleLogout}
        />
    );
}

export default DrivePage;