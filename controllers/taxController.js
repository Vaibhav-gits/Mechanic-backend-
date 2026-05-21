const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


exports.addTax = (req, res) => {
  const userId = req.user?.id;
  const { name, percentage } = req.body;

  if (!name || percentage === undefined) {
    return res.status(400).json({ isSuccess: false, message: 'Name and percentage are required.' });
  }

  const newId = uuidv4();
  const sql = `INSERT INTO taxes (id, user_id, name, percentage, is_deleted, created_at)
               VALUES (?, ?, ?, ?, 0, ?)`;

  db.query(sql, [newId, userId, name, percentage, new Date()], (err) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: 'Tax added successfully.',
      response: { id: newId, userId, name, percentage },
    });
  });
};


exports.updateTax = (req, res) => {
  const userId = req.user?.id;
  const { id, name, percentage } = req.body;

  if (!id) return res.status(400).json({ isSuccess: false, message: 'Id is required.' });

  db.query(
    'SELECT * FROM taxes WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      const tax = existing[0];
      const newName = name || tax.name;
      const newPercentage = percentage !== undefined ? percentage : tax.percentage;

      db.query(
        'UPDATE taxes SET name = ?, percentage = ?, updated_at = ? WHERE id = ?',
        [newName, newPercentage, new Date(), id],
        (err) => {
          if (err) return res.status(500).json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: 'Tax updated successfully.',
            response: { id, userId, name: newName, percentage: newPercentage },
          });
        }
      );
    }
  );
};


exports.getCurrentTaxRate = (req, res) => {
  const userId = req.user?.id;

  const sql = `SELECT id, user_id AS userId, name, percentage, created_at AS createdAt
               FROM taxes
               WHERE user_id = ? AND is_deleted = 0
               ORDER BY created_at DESC`;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} ${result.length > 1 ? 'Taxes' : 'Tax'} found.`,
      totalRecords: result.length,
      response: result,
    });
  });
};


exports.getTaxById = (req, res) => {
  const { Id } = req.query;

  if (!Id) return res.status(400).json({ isSuccess: false, message: 'Id is required.' });

  const sql = `SELECT id, user_id AS userId, name, percentage, created_at AS createdAt
               FROM taxes
               WHERE id = ? AND is_deleted = 0
               LIMIT 1`;

  db.query(sql, [Id], (err, result) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: 'Tax record found.',
      response: result[0],
    });
  });
};