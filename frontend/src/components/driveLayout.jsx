import React, { useRef, useState } from "react";

const DriveLayout = ({
    handleFileChange,
    handleUpload,
    handleDownload,
    handleDelete,
    fileList,
    handleLogout
}) => {
    const fileInputRef = useRef(null);
    const [showPopup, setShowPopup] = useState(false);
    const [decryptKey, setDecryptKey] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);

    const onUploadClick = async () => {
        await handleUpload();
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const onDownloadClick = (filename) => {
        setSelectedFile(filename);
        setShowPopup(true);
    };

    const confirmDecryption = async () => {
        if (!decryptKey) return alert("Please enter a decryption key");
        await handleDownload(selectedFile, decryptKey);
        setDecryptKey("");
        setSelectedFile(null);
        setShowPopup(false);
    };

    return (
        <>
            <header className="drive-header">
                <div role="heading" aria-level="1" className="header-title">
                    Your Encrypted Drive
                </div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </header>

            <div className="drive-container">
                <h1 className="title">Secure Drive</h1>

                {/* upload Section */}
                <div className="card">
                    <h2>Upload File</h2>
                    <div className="upload-section">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <button onClick={onUploadClick} className="primary-btn">
                            Encrypt & Upload
                        </button>
                    </div>
                </div>

                {/* file List */}
                <div className="card">
                    <h2>Encrypted Files</h2>
                    {fileList.length === 0 ? (
                        <p className="empty-msg">No files uploaded yet.</p>
                    ) : (
                        <ul className="file-list">
                            {fileList.map((file, idx) => (
                                <li key={idx} className="file-item">
                                    <span className="filename">{file}</span>
                                    <div className="btn-group">
                                        <button
                                            className="secondary-btn"
                                            onClick={() => handleDownload(file)}
                                        >
                                            Download & Decrypt
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(file)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                    )}
                </div>

                {/* popup for decryption key */}
                {showPopup && (
                    <div className="popup-overlay">
                        <div className="popup-card">
                            <h3>Enter Decryption Key</h3>
                            <input
                                type="text"
                                value={decryptKey}
                                onChange={(e) => setDecryptKey(e.target.value)}
                                placeholder="Paste your decryption key here"
                                className="key-input"
                            />
                            <div className="popup-buttons">
                                <button className="primary-btn" onClick={confirmDecryption}>
                                    Decrypt
                                </button>
                                <button
                                    className="secondary-btn"
                                    onClick={() => {
                                        setShowPopup(false);
                                        setDecryptKey("");
                                        setSelectedFile(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DriveLayout;