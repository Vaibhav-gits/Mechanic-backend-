const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.addDefaultExpense = (req, res) => {
  const userId = req.user?.id;
  const { name, amount } = req.body;

  if (!name)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Name is required." });

  const newId = uuidv4();
  const sql = `INSERT INTO default_expenses (id, user_id, name, amount, is_deleted, created_at)
               VALUES (?, ?, ?, ?, 0, ?)`;

  db.query(sql, [newId, userId, name, amount || 0, new Date()], (err) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: "Default expense added successfully.",
      response: { id: newId, userId, name, amount: amount || 0 },
    });
  });
};

exports.updateDefaultExpense = (req, res) => {
  const { id, name, amount } = req.body;

  if (!id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  db.query(
    "SELECT * FROM default_expenses WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      }

      const record = existing[0];
      const newName = name || record.name;
      const newAmount = amount !== undefined ? amount : record.amount;

      db.query(
        "UPDATE default_expenses SET name = ?, amount = ?, updated_at = ? WHERE id = ?",
        [newName, newAmount, new Date(), id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Default expense updated successfully.",
            response: { id, name: newName, amount: newAmount },
          });
        },
      );
    },
  );
};

exports.deleteDefaultExpense = (req, res) => {
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  db.query(
    "SELECT * FROM default_expenses WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [Id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      }

      db.query(
        "UPDATE default_expenses SET is_deleted = 1 WHERE id = ?",
        [Id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Default expense deleted successfully.",
            response: null,
          });
        },
      );
    },
  );
};

exports.getAllDefaultExpense = (req, res) => {
  const userId = req.user?.id;
  const { pageNumber, pageSize } = req.body;

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) AS total FROM default_expenses WHERE user_id = ? AND is_deleted = 0`;
  const dataSql = `SELECT id, user_id AS userId, name, amount, created_at AS createdAt
                   FROM default_expenses
                   WHERE user_id = ? AND is_deleted = 0
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?`;

  db.query(countSql, [userId], (err, countResult) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    const total = countResult[0].total;

    db.query(dataSql, [userId, limit, offset], (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });

      if (result.length === 0) {
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      }

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${total} Default ${total > 1 ? "Expenses" : "Expense"} found.`,
        totalRecords: total,
        response: result,
      });
    });
  });
};

exports.getDefaultExpenseById = (req, res) => {
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  const sql = `SELECT id, user_id AS userId, name, amount, created_at AS createdAt
               FROM default_expenses
               WHERE id = ? AND is_deleted = 0
               LIMIT 1`;

  db.query(sql, [Id], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: "Default expense record found.",
      response: result[0],
    });
  });
};
