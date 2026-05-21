const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.addUpdateCategory = (req, res) => {
  const userId = req.user?.id;
  const { id, name, statusId } = req.body;

  if (!name || !statusId) {
    return res
      .status(400)
      .json({ isSuccess: false, message: "Name and StatusId are required" });
  }

  const dupSql = `SELECT id FROM categories 
                  WHERE name = ? AND user_id = ? AND is_deleted = 0 
                  ${id ? "AND id != ?" : ""}`;
  const dupParams = id ? [name.trim(), userId, id] : [name.trim(), userId];

  db.query(dupSql, dupParams, (err, dupResult) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (dupResult.length > 0) {
      return res.status(409).json({
        isSuccess: false,
        statusCode: 409,
        errors: ["Name already exists"],
      });
    }

    if (id) {
      const findSql =
        "SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_deleted = 0";
      db.query(findSql, [id, userId], (err, existing) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        if (existing.length === 0) {
          return res
            .status(204)
            .json({ isSuccess: false, errors: ["Not found"] });
        }

        const updateSql = `UPDATE categories 
                           SET name = ?, status_id = ?, is_default = 0, updated_at = ? 
                           WHERE id = ? AND user_id = ?`;
        db.query(
          updateSql,
          [name.trim(), statusId, new Date(), id, userId],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });

            res.json({
              isSuccess: true,
              statusCode: 200,
              message: "Category updated successfully",
              response: {
                categoryVM: {
                  id,
                  name: name.trim(),
                  statusId,
                  userId,
                  isDefault: false,
                },
              },
            });
          },
        );
      });
    } else {
      const newId = uuidv4();
      const insertSql = `INSERT INTO categories 
                         (id, name, user_id, status_id, created_by, is_default, is_deleted, created_at)
                         VALUES (?, ?, ?, ?, ?, 0, 0, ?)`;
      db.query(
        insertSql,
        [newId, name.trim(), userId, statusId, userId, new Date()],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Category added successfully",
            response: {
              categoryVM: {
                id: newId,
                name: name.trim(),
                statusId,
                userId,
                isDefault: false,
              },
            },
          });
        },
      );
    }
  });
};

exports.deleteCategory = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const findSql =
    "SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_deleted = 0";
  db.query(findSql, [Id, userId], (err, existing) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (existing.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    const serviceCheckSql =
      "SELECT id FROM services WHERE category_id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1";
    db.query(serviceCheckSql, [Id, userId], (err, services) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });

      if (services.length > 0) {
        return res.status(400).json({
          isSuccess: false,
          statusCode: 400,
          errors: ["Unable to delete, this category has services."],
        });
      }

      db.query(
        "UPDATE categories SET is_deleted = 1 WHERE id = ? AND user_id = ?",
        [Id, userId],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Category deleted successfully",
            response: null,
          });
        },
      );
    });
  });
};

exports.getAllCategory = (req, res) => {
  const userId = req.user?.id;

  const sql = `SELECT id, name, status_id AS statusId, user_id AS userId, 
                      is_default AS isDefault, created_at AS createdAt
               FROM categories
               WHERE user_id = ? AND is_deleted = 0
               ORDER BY name ASC`;

  db.query(sql, [userId], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} ${result.length > 1 ? "Categories" : "Category"} found.`,
      totalRecords: result.length,
      response: result,
    });
  });
};

exports.getByIdCategory = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const sql = `SELECT id, name, status_id AS statusId, user_id AS userId,
                      is_default AS isDefault, created_at AS createdAt
               FROM categories
               WHERE id = ? AND user_id = ? AND is_deleted = 0`;

  db.query(sql, [Id, userId], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: "Category record found.",
      response: { categoryVM: result[0] },
    });
  });
};
