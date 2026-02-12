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

    const onUploadClick = async () => {
        await handleUpload();
        if (fileInputRef.current) fileInputRef.current.value = "";
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
                            {fileList.map((file) => (
                                <li key={file.storageName} className="file-item">
                                    <span className="filename">{file.displayName}</span>
                                    <div className="btn-group">
                                        <button
                                            className="secondary-btn"
                                            onClick={() => handleDownload(file)}
                                        >
                                            Download & Decrypt
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(file.storageName)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
};

export default DriveLayout;