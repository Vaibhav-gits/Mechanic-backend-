const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


const getDefaultCurrencyId = (callback) => {
  db.query(
    "SELECT id FROM currencies WHERE name = 'USD' AND symbol = '$' AND is_deleted = 0 LIMIT 1",
    (err, result) => {
      if (err) return callback(err, null);
      callback(null, result[0]?.id || null);
    }
  );
};


exports.addUpdateSetting = (req, res) => {
  const userId = req.user?.id;
  const { currencyId, countryId } = req.body;


  db.query(
    'SELECT * FROM settings WHERE user_id = ? AND is_deleted = 0 LIMIT 1',
    [userId],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      getDefaultCurrencyId((err, defaultCurrencyId) => {
        if (err) return res.status(500).json({ isSuccess: false, message: err.message });

        if (existing.length === 0) {
          // INSERT
          const newId = uuidv4();
          const insertSql = `INSERT INTO settings (id, user_id, currency_id, country_id, is_deleted, created_at)
                             VALUES (?, ?, ?, ?, 0, ?)`;
          db.query(
            insertSql,
            [newId, userId, currencyId || defaultCurrencyId, countryId || null, new Date()],
            (err) => {
              if (err) return res.status(500).json({ isSuccess: false, message: err.message });

              res.json({
                isSuccess: true,
                statusCode: 200,
                message: 'Setting added successfully',
                response: {
                  id: newId,
                  userId,
                  currencyId: currencyId || defaultCurrencyId,
                  countryId: countryId || null,
                },
              });
            }
          );
        } else {
   
          const setting = existing[0];
          const newCurrencyId = currencyId || setting.currency_id;
          const newCountryId = countryId || setting.country_id;

          db.query(
            'UPDATE settings SET currency_id = ?, country_id = ?, updated_at = ? WHERE id = ?',
            [newCurrencyId, newCountryId, new Date(), setting.id],
            (err) => {
              if (err) return res.status(500).json({ isSuccess: false, message: err.message });

              res.json({
                isSuccess: true,
                statusCode: 200,
                message: 'Setting updated successfully',
                response: {
                  id: setting.id,
                  userId,
                  currencyId: newCurrencyId,
                  countryId: newCountryId,
                },
              });
            }
          );
        }
      });
    }
  );
};


exports.updateSetting = (req, res) => {
  const userId = req.user?.id;
  const { id, currencyId, countryId } = req.body;

  if (!id) return res.status(400).json({ isSuccess: false, message: 'Id is required' });

  db.query(
    'SELECT * FROM settings WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      getDefaultCurrencyId((err, defaultCurrencyId) => {
        if (err) return res.status(500).json({ isSuccess: false, message: err.message });

        const setting = existing[0];
        const newCurrencyId = currencyId || setting.currency_id || defaultCurrencyId;
        const newCountryId = countryId || setting.country_id;

        db.query(
          'UPDATE settings SET currency_id = ?, country_id = ?, user_id = ?, updated_at = ? WHERE id = ?',
          [newCurrencyId, newCountryId, userId, new Date(), id],
          (err) => {
            if (err) return res.status(500).json({ isSuccess: false, message: err.message });

            res.json({
              isSuccess: true,
              statusCode: 200,
              message: 'Setting updated successfully',
              response: {
                id,
                userId,
                currencyId: newCurrencyId,
                countryId: newCountryId,
              },
            });
          }
        );
      });
    }
  );
};


exports.deleteSetting = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id) return res.status(400).json({ isSuccess: false, message: 'Id is required' });

  db.query(
    'SELECT * FROM settings WHERE id = ? AND created_by = ? AND is_deleted = 0 LIMIT 1',
    [Id, userId],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, message: 'Not found' });
      }

      db.query('UPDATE settings SET is_deleted = 1 WHERE id = ?', [Id], (err) => {
        if (err) return res.status(500).json({ isSuccess: false, message: err.message });

        res.json({
          isSuccess: true,
          statusCode: 200,
          message: 'Setting deleted successfully',
          response: null,
        });
      });
    }
  );
};


exports.getAllSetting = (req, res) => {
  const userId = req.user?.id;

  const sql = `
    SELECT s.id, s.user_id AS userId, s.currency_id AS currencyId, s.country_id AS countryId,
           c.name, c.symbol, c.description, c.no_of_decimal_places AS noOfDecimalPlaces
    FROM settings s
    LEFT JOIN currencies c ON c.id = s.currency_id AND c.is_deleted = 0
    WHERE s.user_id = ? AND s.is_deleted = 0
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} ${result.length > 1 ? 'Settings' : 'Setting'} found.`,
      totalRecords: result.length,
      response: result,
    });
  });
};


exports.getUsersCurrencySetting = (req, res) => {
  const userId = req.user?.id;

  const sql = `
    SELECT s.id, s.user_id AS userId, s.currency_id AS currencyId, s.country_id AS countryId,
           c.name, c.symbol, c.description, c.no_of_decimal_places AS noOfDecimalPlaces
    FROM settings s
    LEFT JOIN currencies c ON c.id = s.currency_id AND c.is_deleted = 0
    WHERE s.user_id = ? AND s.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: 'Setting record found.',
      response: result[0],
    });
  });
};