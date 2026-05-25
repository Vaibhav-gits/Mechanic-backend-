const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const getCustomerCount = (userId, callback) => {
  const sql = `
    SELECT
     COUNT(*) AS totalCount,
      SUM(CASE WHEN gender = 1 THEN 1 ELSE 0 END) AS maleCount,
      SUM(CASE WHEN gender = 2 THEN 1 ELSE 0 END) AS femaleCount,
      SUM(CASE WHEN gender = 3 THEN 1 ELSE 0 END) AS otherCount
    FROM customers
    WHERE user_id = ? AND is_deleted = 0
  `;
  db.query(sql, [userId], (err, result) => {
    if (err) return callback(err, null);
    callback(null, result[0]);
  });
};

exports.addCustomer = (req, res) => {
  const userId = req.user?.id;
  const { name, gender, phoneNumber, dob } = req.body;

  if (!name || !gender || !phoneNumber) {
    return res.status(400).json({
      isSuccess: false,
      message: "Name, Gender and PhoneNumber are required",
    });
  }

  const findSql =
    "SELECT * FROM customers WHERE phone_number = ? AND user_id = ? AND is_deleted = 0 LIMIT 1";
  db.query(findSql, [phoneNumber, userId], (err, existing) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (existing.length > 0) {
      const updateSql = `UPDATE customers SET name = ?, gender = ?, dob = ?, updated_at = ?
                         WHERE phone_number = ? AND user_id = ? AND is_deleted = 0`;
      db.query(
        updateSql,
        [name, gender, dob || null, new Date(), phoneNumber, userId],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          getCustomerCount(userId, (err, countModel) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });

            res.json({
              isSuccess: true,
              statusCode: 200,
              message: "Customer added successfully",
              response: {
                id: existing[0].id,
                name,
                gender,
                phoneNumber,
                dob: dob || null,
                userId,
                customerCountModel: countModel,
              },
            });
          });
        },
      );
    } else {
      const newId = uuidv4();
      const insertSql = `INSERT INTO customers (id, name, gender, phone_number, dob, user_id, created_by, is_deleted, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`;
      db.query(
        insertSql,
        [
          newId,
          name,
          gender,
          phoneNumber,
          dob || null,
          userId,
          userId,
          new Date(),
        ],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          getCustomerCount(userId, (err, countModel) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });

            res.json({
              isSuccess: true,
              statusCode: 200,
              message: "Customer added successfully",
              response: {
                id: newId,
                name,
                gender,
                phoneNumber,
                dob: dob || null,
                userId,
                customerCountModel: countModel,
              },
            });
          });
        },
      );
    }
  });
};

exports.updateCustomer = (req, res) => {
  const userId = req.user?.id;
  const { id, name, gender, phoneNumber, dob } = req.body;

  if (!id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const findSql =
    "SELECT * FROM customers WHERE id = ? AND is_deleted = 0 LIMIT 1";
  db.query(findSql, [id], (err, existing) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (existing.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    const updateSql = `UPDATE customers SET name = ?, gender = ?, phone_number = ?, dob = ?,
                       is_default = 0, updated_at = ? WHERE id = ?`;
    db.query(
      updateSql,
      [name, gender, phoneNumber, dob || null, new Date(), id],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });

        getCustomerCount(userId, (err, countModel) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Customer updated successfully",
            response: {
              id,
              name,
              gender,
              phoneNumber,
              dob: dob || null,
              userId,
              customerCountModel: countModel,
            },
          });
        });
      },
    );
  });
};

exports.deleteCustomer = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const findSql =
    "SELECT * FROM customers WHERE id = ? AND created_by = ? AND is_deleted = 0 LIMIT 1";
  db.query(findSql, [Id, userId], (err, existing) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (existing.length === 0) {
      return res.status(204).json({ isSuccess: false, message: "Not found" });
    }

    db.query(
      "UPDATE customers SET is_deleted = 1 WHERE id = ?",
      [Id],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });

        res.json({
          isSuccess: true,
          statusCode: 200,
          message: "Customer deleted successfully",
          response: null,
        });
      },
    );
  });
};

exports.getAllCustomer = (req, res) => {
  const userId = req.user?.id;

  const sql = `SELECT id, name, gender, phone_number AS phoneNumber, dob,
                      user_id AS userId, created_at AS createdAt
               FROM customers
               WHERE user_id = ? AND is_deleted = 0
               ORDER BY name ASC`;

  db.query(sql, [userId], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    getCustomerCount(userId, (err, countModel) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${result.length} ${result.length > 1 ? "Customers" : "Customer"} found.`,
        totalRecords: result.length,
        response: {
          customerList: result,
          customerCountModel: countModel,
        },
      });
    });
  });
};

exports.getCustomerById = (req, res) => {
  const userId = req.user?.id;
  const { id, phoneNumber } = req.body;

  let sql, params;
  if (id) {
    sql = `SELECT id, name, gender, phone_number AS phoneNumber, dob, user_id AS userId
           FROM customers WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1`;
    params = [id, userId];
  } else if (phoneNumber) {
    sql = `SELECT id, name, gender, phone_number AS phoneNumber, dob, user_id AS userId
           FROM customers WHERE phone_number = ? AND user_id = ? AND is_deleted = 0 LIMIT 1`;
    params = [phoneNumber, userId];
  } else {
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id or PhoneNumber is required" });
  }

  db.query(sql, params, (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    getCustomerCount(userId, (err, countModel) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: "Customer record found.",
        response: {
          ...result[0],
          customerCountModel: countModel,
        },
      });
    });
  });
};
