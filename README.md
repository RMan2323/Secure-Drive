## SecureDrive is a privacy-first cloud storage app where:
* Files are encrypted on the client before upload
* The server never sees plaintext
* Each file uses a unique Content Encryption Key (CEK)
* The CEK is encrypted (“wrapped”) using a user-specific Master Key
* The Master Key is itself encrypted using the user’s password-derived key

## Packages
1. Vite
2. Express (to handle API routes, serve data, and manage HTTP requests and responses)
3. Multer (to process and store files uploaded by users)
4. CORS (Cross-Origin Resource Sharing)
5. Axios (for making API requests)

## Project Structure
```
project/
 ├─ backend/
 │   ├─ server.js
 │   ├─ storage/
 │   │   ├─ uploads/
 │   │   └─ files.json
 │   └─ package.json
 ├─ frontend/
 │   ├─ src/
 │   ├─ package.json
 │   └─ public/
 └─ README.md
```

## Running the Project
### 1. Clone the repo
```
git clone https://github.com/RMan2323/Secure-Drive
cd project
```
### 2. Set up backend
```
cd backend
npm install
node server.js
```

### 3. Set up frontend
```
cd frontend
npm install
npm start
```

## Working Flow
### Signup
1. User enters email + password
2. Browser generates Master Key
3. Master Key is encrypted with password
4. Wrapped key is sent to backend
5. Server never sees password

### Login
1. Wrapped key fetched from server
2. User password derives key
3. Master Key is decrypted in browser
4. Master Key stored in memory (`window.__MASTER_KEY`)

### Upload
1. Generate per-file CEK
2. Encrypt file with CEK (AES-GCM)
3. Wrap CEK with Master Key
4. Upload:
    * encrypted file
    * wrapped CEK
    * IVs

### Download
1. Fetch metadata (wrapped CEK)
2. Unwrap CEK using Master Key
3. Download encrypted file
4. Decrypt locally
