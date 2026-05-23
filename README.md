# 🔐 SecureDrive

> **Zero-knowledge cloud storage — the server never sees your files.**

SecureDrive is a privacy-first cloud storage application where all encryption and decryption happens entirely in the browser. Even the server administrators cannot access file contents. Built at IIT Dharwad as part of an ongoing BTP research project.

---

## The Core Idea

Most cloud storage services (Google Drive, Dropbox) encrypt your files *on their servers* — meaning they hold the keys and can technically read your data. SecureDrive flips this: **your files are encrypted before they leave your device**, using keys that only you control.

---

## Encryption Architecture

```
User Password
      │
      ▼
 PBKDF2 / HKDF
 (Key Derivation)
      │
      ▼
Password-Derived Key (PDK)
      │  encrypts
      ▼
 Master Key (MK)          ←── generated once at signup, lives only in browser memory
      │  wraps
      ▼
Content Encryption Key (CEK)  ←── unique per file
      │  encrypts
      ▼
  Encrypted File  ──────────────────────► Server stores this
  Wrapped CEK     ──────────────────────► Server stores this
  IVs             ──────────────────────► Server stores this
```

**What the server stores:** encrypted bytes, wrapped keys, and IVs — nothing readable without the user's password.

**What the server never sees:** the user's password, the Master Key, any Content Encryption Key, or any plaintext file content.

---

## Encryption Primitives Used

| Operation | Algorithm | Details |
|-----------|-----------|---------|
| File encryption | AES-GCM | 256-bit key, unique IV per file |
| Key wrapping | AES-GCM | CEK wrapped with Master Key |
| Master Key protection | AES-GCM | MK wrapped with password-derived key |
| Key derivation | PBKDF2 | SHA-256, 100,000 iterations |
| All crypto | Web Crypto API | Native browser, no third-party crypto libs |

---

## User Flow

### Signup
1. User enters email + password
2. Browser generates a random **Master Key**
3. Master Key is encrypted ("wrapped") using a key derived from the user's password
4. Only the **wrapped Master Key** is sent to the server — password never leaves the browser

### Login
1. Wrapped Master Key is fetched from server
2. User's password derives the unwrapping key locally
3. Master Key is decrypted in browser memory
4. Session proceeds with Master Key held only in memory (`window.__MASTER_KEY`)

### Upload
1. Browser generates a unique **Content Encryption Key (CEK)** for the file
2. File is encrypted with CEK using AES-GCM
3. CEK is wrapped using the Master Key
4. Server receives: encrypted file + wrapped CEK + initialization vectors

### Download
1. Wrapped CEK fetched from server
2. CEK unwrapped locally using Master Key
3. Encrypted file downloaded
4. File decrypted locally — plaintext never touches the server

---

## Project Structure

```
Secure-Drive/
├── backend/
│   ├── server.js          # Express API server
│   ├── uploads/           # Encrypted file storage
│   └── storage/
│       ├── files.json     # File metadata store
│       └── users.json     # User + wrapped key store
├── frontend/
│   ├── index.html
│   └── src/               # Vite + Vanilla JS frontend
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite, Vanilla JS, Web Crypto API |
| Backend | Node.js, Express.js |
| File handling | Multer |
| HTTP client | Axios |
| Cross-origin | CORS |

---

## Running Locally

**Prerequisites:** Node.js v18+

```bash
# 1. Clone the repo
git clone https://github.com/RMan2323/Secure-Drive
cd Secure-Drive

# 2. Start backend
cd backend
npm install
node server.js
# Runs on http://localhost:3000

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Current Limitations

These are known limitations actively being addressed as part of the BTP research work:

- User data stored in flat JSON files (no database)
- No session management or JWT-based authentication
- Files stored locally on server filesystem (no cloud storage backend)
- Master Key stored in `window` object (browser memory — cleared on tab close)
- No file sharing or access control between users
- No audit logging of file access events

---

## Planned Research Extensions (BTP Scope)

The following directions are being explored as part of the BTP at IIT Dharwad:

- **Database migration** — Replace JSON stores with MongoDB for persistent, scalable user and file metadata management
- **Formal authentication** — JWT-based session management with secure token refresh
- **Cloud storage backend** — Integration with AWS S3 or equivalent for scalable encrypted file storage
- **Secure key storage** — Replace `window.__MASTER_KEY` with Web Crypto non-extractable key handles
- **Access control** — Encrypted file sharing between users via public-key cryptography
- **Tamper-evident audit logs** — Blockchain or Merkle-tree based logging of all file access events
- **Formal security analysis** — Threat modelling and security proofs for the key hierarchy

---

## Security Model

SecureDrive follows a **zero-knowledge architecture**: the system is designed such that a compromise of the server reveals no plaintext data. Security guarantees hold as long as:

1. The user's password is not compromised
2. The browser environment is not compromised
3. AES-GCM with unique IVs is used correctly (enforced in implementation)

This project does **not** currently protect against: client-side malware, phishing, or browser extension attacks — areas identified for future research.

---

## Authors

**Yashaswini L** — IIT Dharwad, CSE (cs23bt060@iitdh.ac.in)  
**Raghuveer Verma** — IIT Dharwad, CSE
