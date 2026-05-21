const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const authRoutes = require('./routes/authRoutes');

app.use(cors());
app.use(express.json());

app.use('/api/salon', authRoutes);  

app.get('/', (req, res) => {
  res.send('Mechanical Invoice API Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});