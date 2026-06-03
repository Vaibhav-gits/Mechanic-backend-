const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// POST /api/salon/subscription/addsubscription
exports.addSubscription = (req, res) => {
  const userId = req.user?.id;
  const { productId, productType, purchaseToken, receiptData, platformId } = req.body;

  if (!userId) {
    return res.status(401).json({ isSuccess: false, message: 'Unauthorized' });
  }

  if (!productId && !productType) {
    return res.status(400).json({ isSuccess: false, message: 'productId or productType is required' });
  }

  const planId = productType || productId;
  const now = new Date();
  const newId = uuidv4();

  // Deactivate any existing active subscriptions for this user
  db.query(
    'UPDATE user_subscriptions SET is_active = 0, updated_at = ? WHERE user_id = ? AND is_active = 1',
    [now, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ isSuccess: false, message: err.message });
      }

      // Insert new subscription record
      const sql = `
        INSERT INTO user_subscriptions
          (id, user_id, plan_id, purchase_token, receipt_data, platform_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `;

      db.query(
        sql,
        [newId, userId, planId, purchaseToken || null, receiptData || null, platformId || null, now],
        (err) => {
          if (err) {
            return res.status(500).json({ isSuccess: false, message: err.message });
          }

          return res.json({ isSuccess: true, statusCode: 200, message: 'Subscription recorded', response: { id: newId } });
        },
      );
    },
  );
};

module.exports = exports;
