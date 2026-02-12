import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const sessions = {};

const USERS_FILE = path.join(process.cwd(), 'storage', 'users.json');
const FILES_META = path.join(process.cwd(), 'storage', 'files.json');

if (!fs.existsSync(path.join(process.cwd(), 'storage'))) fs.mkdirSync(path.join(process.cwd(), 'storage'));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(FILES_META)) fs.writeFileSync(FILES_META, JSON.stringify([]));

//TODO configure cors properly
app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
    const token = req.headers.authorization;

    if (!token || !sessions[token]) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    req.userEmail = sessions[token];
    next();
}

//making sure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = crypto.randomUUID() + ".enc";
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

function readSafeJSON(file) {
    try {
        const data = fs.readFileSync(file, 'utf-8');
        if (!data.trim()) return [];
        return JSON.parse(data);
    } catch (err) {
        console.warn(`Warning: could not parse ${path.basename(file)}, resetting.`, err);
        fs.writeFileSync(file, JSON.stringify([]));
        return [];
    }
}
function writeSafeJSON(file, arr) {
    fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function readUsers() { return readSafeJSON(USERS_FILE); }
function writeUsers(users) { writeSafeJSON(USERS_FILE, users); }
function readFilesMeta() { return readSafeJSON(FILES_META); }
function writeFilesMeta(arr) { writeSafeJSON(FILES_META, arr); }

app.get('/', (req, res) => {
    res.send('Secure Drive backend running');
});

//upload with CEK metadata
app.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'no file' });

        //meta comes from multipart form field 'meta'
        let meta = {};
        try {
            if (req.body.meta) meta = JSON.parse(req.body.meta);
        } catch (e) {
            console.warn('Invalid meta JSON', e);
        }

        //store meta for this filename
        const filesMeta = readFilesMeta();
        const filename = req.file.filename;
        const filtered = filesMeta.filter(f => f.filename !== filename);
        filtered.push({
            filename,
            owner: req.userEmail,
            wrappedCekB64: meta.wrappedCekB64 || null,
            wrapIvB64: meta.wrapIvB64 || null,
            encryptedFileNameB64: meta.encryptedFileNameB64 || null,
            ivNameB64: meta.ivNameB64 || null,
            uploadedAt: new Date().toISOString()
        });

        writeFilesMeta(filtered);

        console.log('File uploaded:', filename, 'meta:', meta ? 'present' : 'none');
    res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'upload failed' });
    }
});

//get metadata for a file
app.get('/api/meta/:filename', authMiddleware, (req, res) => {
    const fname = req.params.filename;
    const filesMeta = readFilesMeta();
    const record = filesMeta.find(f => f.filename === fname);
    if (!record || record.owner !== req.userEmail) {
        return res.status(403).json({ error: "Forbidden" });
    }
    res.json({
        wrappedCekB64: record.wrappedCekB64,
        wrapIvB64: record.wrapIvB64,
        encryptedFileNameB64: record.encryptedFileNameB64,
        ivNameB64: record.ivNameB64,
        uploadedAt: record.uploadedAt
    });
});

app.get('/files', authMiddleware, (req, res) => {
    const filesMeta = readFilesMeta();

    const userFiles = filesMeta
        .filter(f => f.owner === req.userEmail)
        .map(f => f.filename);

    res.json(userFiles);
});

app.get('/download/:filename', authMiddleware, (req, res) => {
    const filename = req.params.filename;

    const filesMeta = readFilesMeta();
    const record = filesMeta.find(f => f.filename === filename);

    if (!record || record.owner !== req.userEmail) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found");
    }
});

app.delete('/delete/:filename', authMiddleware, (req, res) => {
    const filename = decodeURIComponent(req.params.filename);

    const filesMeta = readFilesMeta();
    const record = filesMeta.find(f => f.filename === filename);

    if (!record || record.owner !== req.userEmail) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // remove metadata
    writeFilesMeta(filesMeta.filter(f => f.filename !== filename));

    res.json({ success: true });
});

//register and store wrapped master key and salt for user
app.post('/api/register', (req, res) => {
    const { email, wrappedMasterKeyB64, ivB64, saltB64 } = req.body;
    if (!email || !wrappedMasterKeyB64 || !ivB64 || !saltB64) {
        return res.status(400).json({ error: 'missing' });
    }

    const users = readUsers();
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'user exists' });
    }

    users.push({
        email,
        wrappedMasterKeyB64,
        ivB64,
        saltB64,
        createdAt: new Date().toISOString(),
    });
    writeUsers(users);
    res.json({ ok: true });
});

//get wrapped master key for login
app.post('/api/get-wrapped-key', (req, res) => {
    const { email } = req.body;
    const users = readUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'not found' });

    res.json({
        wrappedMasterKeyB64: user.wrappedMasterKeyB64,
        ivB64: user.ivB64,
        saltB64: user.saltB64,
    });
});

app.post('/api/login', (req, res) => {
    const { email } = req.body;

    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    // generate session token
    const token = crypto.randomBytes(32).toString("hex");
    sessions[token] = email;

    res.json({ token });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));