import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

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

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));