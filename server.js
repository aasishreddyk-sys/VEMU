import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSeed, prepareStore } from './src/appCore.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sams';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
let mongoEnabled = false;
let memoryStore = prepareStore(buildSeed());

const AppStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    store: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

const AppState = mongoose.model('AppState', AppStateSchema);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function readOrCreateStore() {
  if (!mongoEnabled) {
    return { key: 'main', store: memoryStore };
  }
  let record = await AppState.findOne({ key: 'main' });
  if (!record) {
    record = await AppState.create({ key: 'main', store: prepareStore(buildSeed()) });
  }
  return record;
}

app.get('/api/health', async (_req, res) => {
  const state = mongoose.connection.readyState;
  res.json({
    ok: true,
    mongoState: state,
    storage: mongoEnabled ? 'mongodb' : 'memory'
  });
});

app.get('/api/store', async (_req, res) => {
  const record = await readOrCreateStore();
  res.json({ store: prepareStore(record.store) });
});

app.put('/api/store', async (req, res) => {
  const incomingStore = req.body?.store;
  if (!incomingStore) {
    res.status(400).json({ error: 'Missing store payload.' });
    return;
  }

  const normalized = prepareStore(incomingStore);
  if (!mongoEnabled) {
    memoryStore = normalized;
    res.json({ store: memoryStore });
    return;
  }
  const record = await AppState.findOneAndUpdate(
    { key: 'main' },
    { $set: { store: normalized } },
    { new: true, upsert: true }
  );

  res.json({ store: record.store });
});

app.post('/api/store/reset', async (_req, res) => {
  const seed = prepareStore(buildSeed());
  if (!mongoEnabled) {
    memoryStore = seed;
    res.json({ store: memoryStore });
    return;
  }
  const record = await AppState.findOneAndUpdate(
    { key: 'main' },
    { $set: { store: seed } },
    { new: true, upsert: true }
  );

  res.json({ store: record.store });
});

app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Server error' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    mongoEnabled = true;
    console.log(`MongoDB connected: ${MONGODB_URI}`);
  } catch (error) {
    mongoEnabled = false;
    console.warn('MongoDB connection failed. Falling back to in-memory storage.');
    console.warn(error.message);
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} using ${mongoEnabled ? 'mongodb' : 'memory'} storage`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
