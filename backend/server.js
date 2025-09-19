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
if (!fs.existsSync(path.join(process.cwd(), 'storage'))) fs.mkdirSync(path.join(process.cwd(), 'storage'));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

//TODO configure cors properly
app.use(cors());

//making sure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

//routes
app.get('/', (req, res) => {
    res.send('Secure Drive backend running');
});

app.post('/upload', upload.single('file'), (req, res) => {
    console.log('File uploaded:', req.file.originalname);
    res.json({ success: true });
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

//helper to read/write users
function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE));
}
function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

//register and store wrapped master key and salt for user
app.post('/api/register', express.json(), (req, res) => {
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
app.post('/api/get-wrapped-key', express.json(), (req, res) => {
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