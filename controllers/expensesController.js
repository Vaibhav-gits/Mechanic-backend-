const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');


exports.addExpenses = (req, res) => {
  const userId = req.user?.id;
  const { name, amount, expenseDate, defaultExpenseId } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ isSuccess: false, message: 'Name and amount are required.' });
  }

  const newId = uuidv4();
  const sql = `INSERT INTO expenses (id, user_id, name, amount, expense_date, default_expense_id, is_deleted, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?)`;

  db.query(
    sql,
    [newId, userId, name, amount, expenseDate || new Date(), defaultExpenseId || null, new Date()],
    (err) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: 'Expense added successfully.',
        response: { id: newId, userId, name, amount, expenseDate, defaultExpenseId },
      });
    }
  );
};


exports.updateExpenses = (req, res) => {
  const { id, name, amount, expenseDate, defaultExpenseId } = req.body;

  if (!id) return res.status(400).json({ isSuccess: false, message: 'Id is required.' });

  db.query(
    'SELECT * FROM expenses WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      const record = existing[0];
      const newName = name || record.name;
      const newAmount = amount !== undefined ? amount : record.amount;
      const newDate = expenseDate || record.expense_date;
      const newDefaultExpenseId = defaultExpenseId || record.default_expense_id;

      db.query(
        'UPDATE expenses SET name = ?, amount = ?, expense_date = ?, default_expense_id = ?, updated_at = ? WHERE id = ?',
        [newName, newAmount, newDate, newDefaultExpenseId, new Date(), id],
        (err) => {
          if (err) return res.status(500).json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: 'Expense updated successfully.',
            response: { id, name: newName, amount: newAmount, expenseDate: newDate, defaultExpenseId: newDefaultExpenseId },
          });
        }
      );
    }
  );
};


exports.deleteExpenses = (req, res) => {
  const { Id } = req.query;

  if (!Id) return res.status(400).json({ isSuccess: false, message: 'Id is required.' });

  db.query(
    'SELECT * FROM expenses WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [Id],
    (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      db.query('UPDATE expenses SET is_deleted = 1 WHERE id = ?', [Id], (err) => {
        if (err) return res.status(500).json({ isSuccess: false, message: err.message });

        res.json({
          isSuccess: true,
          statusCode: 200,
          message: 'Expense deleted successfully.',
          response: null,
        });
      });
    }
  );
};


exports.getAllExpenses = (req, res) => {
  const userId = req.user?.id;
  const { pageNumber, pageSize, startDate, endDate } = req.body;

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (page - 1) * limit;

  let whereClauses = ['e.user_id = ?', 'e.is_deleted = 0'];
  let params = [userId];

  if (startDate) { whereClauses.push('e.expense_date >= ?'); params.push(startDate); }
  if (endDate)   { whereClauses.push('e.expense_date <= ?'); params.push(endDate); }

  const where = whereClauses.join(' AND ');

  const countSql = `SELECT COUNT(*) AS total FROM expenses e WHERE ${where}`;
  const dataSql = `
    SELECT e.id, e.user_id AS userId, e.name, e.amount, e.expense_date AS expenseDate,
           e.default_expense_id AS defaultExpenseId, de.name AS defaultExpenseName,
           e.created_at AS createdAt
    FROM expenses e
    LEFT JOIN default_expenses de ON de.id = e.default_expense_id AND de.is_deleted = 0
    WHERE ${where}
    ORDER BY e.expense_date DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    const total = countResult[0].total;

    db.query(dataSql, [...params, limit, offset], (err, result) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      if (result.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${total} ${total > 1 ? 'Expenses' : 'Expense'} found.`,
        totalRecords: total,
        response: result,
      });
    });
  });
};


exports.getAllExpensesIncome = (req, res) => {
  const userId = req.user?.id;
  const { startDate, endDate } = req.body;

  let whereClauses = ['user_id = ?', 'is_deleted = 0'];
  let expenseParams = [userId];
  let billingParams = [userId];

  if (startDate) {
    whereClauses.push('created_at >= ?');
    expenseParams.push(startDate);
    billingParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push('created_at <= ?');
    expenseParams.push(endDate);
    billingParams.push(endDate);
  }

  const where = whereClauses.join(' AND ');

  const expenseSql = `SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses WHERE ${where}`;
  const incomeSql  = `SELECT COALESCE(SUM(total_amount), 0) AS totalIncome FROM billings WHERE ${where}`;

  db.query(expenseSql, expenseParams, (err, expResult) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    db.query(incomeSql, billingParams, (err, incResult) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      const totalExpenses = parseFloat(expResult[0].totalExpenses) || 0;
      const totalIncome   = parseFloat(incResult[0].totalIncome) || 0;
      const profit        = totalIncome - totalExpenses;

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: 'Expenses income data found.',
        response: { totalExpenses, totalIncome, profit },
      });
    });
  });
};


exports.getProfitCalculate = (req, res) => {
  const userId = req.user?.id;
  const { startDate, endDate } = req.body;

  let params = [userId];
  let dateFilter = '';

  if (startDate) { dateFilter += ' AND created_at >= ?'; params.push(startDate); }
  if (endDate)   { dateFilter += ' AND created_at <= ?'; params.push(endDate); }

  const incomeSql  = `SELECT COALESCE(SUM(total_amount), 0) AS totalIncome FROM billings WHERE user_id = ? AND is_deleted = 0${dateFilter}`;
  const expenseSql = `SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses WHERE user_id = ? AND is_deleted = 0${dateFilter}`;

  db.query(incomeSql, params, (err, incResult) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    db.query(expenseSql, params, (err, expResult) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      const totalIncome   = parseFloat(incResult[0].totalIncome) || 0;
      const totalExpenses = parseFloat(expResult[0].totalExpenses) || 0;
      const netProfit     = totalIncome - totalExpenses;

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: 'Profit calculated successfully.',
        response: { totalIncome, totalExpenses, netProfit },
      });
    });
  });
};


exports.getExpensesById = (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ isSuccess: false, message: 'Id is required.' });

  const sql = `
    SELECT e.id, e.user_id AS userId, e.name, e.amount, e.expense_date AS expenseDate,
           e.default_expense_id AS defaultExpenseId, de.name AS defaultExpenseName,
           e.created_at AS createdAt
    FROM expenses e
    LEFT JOIN default_expenses de ON de.id = e.default_expense_id AND de.is_deleted = 0
    WHERE e.id = ? AND e.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: 'Expense record found.',
      response: result[0],
    });
  });
};