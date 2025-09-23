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

const USERS_FILE = path.join(process.cwd(), 'storage', 'users.json');
const FILES_META = path.join(process.cwd(), 'storage', 'files.json');

if (!fs.existsSync(path.join(process.cwd(), 'storage'))) fs.mkdirSync(path.join(process.cwd(), 'storage'));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(FILES_META)) fs.writeFileSync(FILES_META, JSON.stringify([]));

//TODO configure cors properly
app.use(cors());
app.use(express.json());

//making sure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, file.originalname)
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
app.post('/upload', upload.single('file'), (req, res) => {
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
            wrappedCekB64: meta.wrappedCekB64 || null,
            wrapIvB64: meta.wrapIvB64 || null,
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
app.get('/api/meta/:filename', (req, res) => {
    const fname = req.params.filename;
    const filesMeta = readFilesMeta();
    const record = filesMeta.find(f => f.filename === fname);
    if (!record) return res.status(404).json({ error: 'metadata not found' });
    res.json({
        wrappedCekB64: record.wrappedCekB64,
        wrapIvB64: record.wrapIvB64,
        uploadedAt: record.uploadedAt
    });
});

app.get('/files', (req, res) => {
    const files = fs.readdirSync(uploadDir);
    res.json(files);
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

app.delete('/delete/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(uploadDir, filename);

    console.log('Delete request received for:', filename);
    console.log('Resolved file path:', filePath);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('File deleted:', filename);
        res.json({ success: true, message: 'File deleted successfully' });
    } else {
        console.warn('File not found:', filename);
        res.status(404).json({ success: false, message: 'File not found' });
    }
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

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));