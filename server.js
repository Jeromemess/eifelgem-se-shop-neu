
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '5mb' })); // Erlaubt größere Bilder beim Upload

// Initialdaten, falls die Datenbank-Datei noch nicht existiert
const INITIAL_DATA = {
  products: [
    { id: 'p1', name: 'Frische Karotten', pricePerUnit: 2.5, unit: 'Bund', imageUrl: 'https://picsum.photos/seed/carrot/400/300', stockQuantity: 20, isActive: true, description: 'Knackige Karotten direkt aus der Erde.' },
    { id: 'p2', name: 'Hof-Kartoffeln', pricePerUnit: 4.0, unit: 'kg', imageUrl: 'https://picsum.photos/seed/potato/400/300', stockQuantity: 50, isActive: true, description: 'Festkochend und geschmackvoll.' }
  ],
  orders: [],
  settings: { pickupDay: 'Mittwoch', pickupTime: '17:00' }
};

// Datenbank-Helfer
const readData = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2));
      return INITIAL_DATA;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return INITIAL_DATA;
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// API Endpunkte für das Frontend
app.get('/api/products', (req, res) => res.json(readData().products));

app.post('/api/products', (req, res) => {
  const data = readData();
  const product = req.body;
  const idx = data.products.findIndex(p => p.id === product.id);
  if (idx > -1) data.products[idx] = product;
  else data.products.push(product);
  writeData(data);
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const data = readData();
  data.products = data.products.filter(p => p.id !== req.params.id);
  writeData(data);
  res.sendStatus(200);
});

app.get('/api/orders', (req, res) => res.json(readData().orders));

app.post('/api/orders', (req, res) => {
  const data = readData();
  const { customerName, items, weekLabel, totalAmount } = req.body;
  
  // Bestand abziehen
  items.forEach(item => {
    const p = data.products.find(prod => prod.id === item.productId);
    if (p) p.stockQuantity -= item.quantity;
  });

  const newOrder = {
    id: Math.random().toString(36).substr(2, 9),
    customerName,
    createdAt: new Date().toISOString(),
    weekLabel,
    items,
    totalAmount
  };
  
  data.orders.push(newOrder);
  writeData(data);
  res.json(newOrder);
});

app.get('/api/settings', (req, res) => res.json(readData().settings));
app.post('/api/settings', (req, res) => {
  const data = readData();
  data.settings = req.body;
  writeData(data);
  res.json(data.settings);
});

// Frontend ausliefern
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
