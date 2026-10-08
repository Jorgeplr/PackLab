const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '8mb' })); // logos y miniaturas viajan como data URL

app.get('/api/health', async (req, res) => {
  await db.raw('select 1');
  res.json({ ok: true });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api', require('./routes/billing'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// Frontend estático + Three.js servido desde node_modules
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));
app.use('/vendor/fonts', express.static(path.join(__dirname, '..', 'node_modules', '@fontsource'), { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.listen(PORT, () => console.log(`PackLab escuchando en http://localhost:${PORT}`));
