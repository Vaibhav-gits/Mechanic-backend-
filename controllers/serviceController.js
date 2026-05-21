const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const validateGenderPrice = (gender, malePrice, femalePrice) => {
  if (!gender || gender === 0) return "Please select gender";
  if (gender === 1 && (!malePrice || malePrice == 0))
    return "Please select male price";
  if (gender === 2 && (!femalePrice || femalePrice == 0))
    return "Please select female price";
  if (gender === 3 && (!malePrice || !femalePrice))
    return "Please select price";
  return null;
};

const resolvePrices = (gender, malePrice, femalePrice) => {
  if (gender === 1) return { malePrice, femalePrice: null };
  if (gender === 2) return { malePrice: null, femalePrice };
  if (gender === 3) return { malePrice, femalePrice };
  return { malePrice: null, femalePrice: null };
};

exports.insertService = (req, res) => {
  const userId = req.user?.id;
  const { categoryId, name, malePrice, femalePrice, gender, statusId } =
    req.body;

  if (!name)
    return res
      .status(400)
      .json({ isSuccess: false, errors: ["Name is required"] });
  if (!categoryId)
    return res
      .status(400)
      .json({
        isSuccess: false,
        statusCode: 400,
        errors: ["Please select category"],
      });

  const genderError = validateGenderPrice(gender, malePrice, femalePrice);
  if (genderError)
    return res
      .status(400)
      .json({ isSuccess: false, statusCode: 400, errors: [genderError] });

  const dupSql = `SELECT id FROM services 
                  WHERE name = ? AND created_by = ? AND is_deleted = 0 LIMIT 1`;
  db.query(dupSql, [name.trim(), userId], (err, dupResult) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (dupResult.length > 0) {
      return res
        .status(409)
        .json({
          isSuccess: false,
          statusCode: 409,
          errors: ["Name already exists"],
        });
    }

    const { malePrice: mp, femalePrice: fp } = resolvePrices(
      gender,
      malePrice,
      femalePrice,
    );
    const newId = uuidv4();

    const insertSql = `INSERT INTO services 
                       (id, name, category_id, male_price, female_price, gender, status_id,
                        user_id, created_by, is_default, is_deleted, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`;
    db.query(
      insertSql,
      [
        newId,
        name.trim(),
        categoryId,
        mp,
        fp,
        gender,
        statusId || 1,
        userId,
        userId,
        new Date(),
      ],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });

        db.query(
          "SELECT name FROM categories WHERE id = ? AND user_id = ? AND is_deleted = 0",
          [categoryId, userId],
          (err, catResult) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });
            const categoryName = catResult[0]?.name || "";

            res.json({
              isSuccess: true,
              statusCode: 200,
              message: "Service added successfully",
              response: {
                serviceVM: {
                  id: newId,
                  name: name.trim(),
                  categoryId,
                  categoryName,
                  malePrice: mp,
                  femalePrice: fp,
                  gender,
                  statusId: statusId || 1,
                  userId,
                  isDefault: false,
                },
              },
            });
          },
        );
      },
    );
  });
};

exports.updateService = (req, res) => {
  const userId = req.user?.id;
  const { id, categoryId, name, malePrice, femalePrice, gender, statusId } =
    req.body;

  if (!id)
    return res
      .status(400)
      .json({ isSuccess: false, errors: ["Id is required"] });
  if (!name)
    return res
      .status(400)
      .json({ isSuccess: false, errors: ["Name is required"] });
  if (!categoryId)
    return res
      .status(400)
      .json({
        isSuccess: false,
        statusCode: 400,
        errors: ["Please select category"],
      });

  const genderError = validateGenderPrice(gender, malePrice, femalePrice);
  if (genderError)
    return res
      .status(400)
      .json({ isSuccess: false, statusCode: 400, errors: [genderError] });

  const dupSql = `SELECT id FROM services 
                  WHERE name = ? AND id != ? AND created_by = ? AND is_deleted = 0 LIMIT 1`;
  db.query(dupSql, [name.trim(), id, userId], (err, dupResult) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (dupResult.length > 0) {
      return res
        .status(409)
        .json({
          isSuccess: false,
          statusCode: 409,
          errors: ["Name already exists"],
        });
    }

    db.query(
      "SELECT * FROM services WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [id],
      (err, existing) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        if (existing.length === 0) {
          return res
            .status(204)
            .json({ isSuccess: false, errors: ["Not found"] });
        }

        const { malePrice: mp, femalePrice: fp } = resolvePrices(
          gender,
          malePrice,
          femalePrice,
        );

        const updateSql = `UPDATE services SET name=?, category_id=?, male_price=?, female_price=?,
                         gender=?, status_id=?, user_id=?, is_default=0, updated_at=? WHERE id=?`;
        db.query(
          updateSql,
          [
            name.trim(),
            categoryId,
            mp,
            fp,
            gender,
            statusId || 1,
            userId,
            new Date(),
            id,
          ],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });

            db.query(
              "SELECT name FROM categories WHERE id = ? AND user_id = ? AND is_deleted = 0",
              [categoryId, userId],
              (err, catResult) => {
                if (err)
                  return res
                    .status(500)
                    .json({ isSuccess: false, message: err.message });
                const categoryName = catResult[0]?.name || "";

                res.json({
                  isSuccess: true,
                  statusCode: 200,
                  message: "Service updated successfully",
                  response: {
                    serviceVM: {
                      id,
                      name: name.trim(),
                      categoryId,
                      categoryName,
                      malePrice: mp,
                      femalePrice: fp,
                      gender,
                      statusId: statusId || 1,
                      userId,
                      isDefault: false,
                    },
                  },
                });
              },
            );
          },
        );
      },
    );
  });
};

exports.deleteService = (req, res) => {
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  db.query(
    "SELECT id FROM services WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [Id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, message: "Not found" });
      }

      db.query(
        "UPDATE services SET is_deleted = 1 WHERE id = ?",
        [Id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });

          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Service deleted successfully",
            response: null,
          });
        },
      );
    },
  );
};

exports.getAllService = (req, res) => {
  const userId = req.user?.id;
  const { gender, getAll = true, pageNumber = 1, pageSize = 10 } = req.body;

  let genderFilter = "";
  const params = [userId];
  if (gender && gender !== 0) {
    genderFilter = "AND s.gender = ?";
    params.push(gender);
  }

  const sql = `
    SELECT s.id, s.name, s.category_id AS categoryId, c.name AS categoryName,
           s.male_price AS malePrice, s.female_price AS femalePrice,
           s.gender, s.status_id AS statusId, s.user_id AS userId,
           s.is_default AS isDefault, s.created_at AS createdAt
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id AND c.is_deleted = 0
    WHERE s.user_id = ? AND s.is_deleted = 0 ${genderFilter}
    ORDER BY c.name ASC, s.name ASC
  `;

  db.query(sql, params, (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, message: "Not found" });
    }

    const grouped = {};
    result.forEach((row) => {
      if (!grouped[row.categoryId]) {
        grouped[row.categoryId] = {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          services: [],
        };
      }
      grouped[row.categoryId].services.push({
        id: row.id,
        name: row.name,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        malePrice: row.malePrice,
        femalePrice: row.femalePrice,
        gender: row.gender,
        statusId: row.statusId,
        userId: row.userId,
        isDefault: row.isDefault,
        createdAt: row.createdAt,
      });
    });

    const servicesByCategory = Object.values(grouped);

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${servicesByCategory.length} ${servicesByCategory.length > 1 ? "services" : "service"} found.`,
      totalRecords: servicesByCategory.length,
      response: {
        selectedGenderID: gender || 0,
        servicesByCategory,
      },
    });
  });
};

exports.getServiceById = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const sql = `
    SELECT s.id, s.name, s.category_id AS categoryId, c.name AS categoryName,
           s.male_price AS malePrice, s.female_price AS femalePrice,
           s.gender, s.status_id AS statusId, s.user_id AS userId,
           s.is_default AS isDefault, s.created_at AS createdAt
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id AND c.is_deleted = 0
    WHERE s.id = ? AND s.user_id = ? AND s.is_deleted = 0 LIMIT 1
  `;

  db.query(sql, [Id, userId], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (result.length === 0) {
      return res.status(204).json({ isSuccess: false, message: "Not found" });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: "Service record found.",
      response: { serviceVM: result[0] },
    });
  });
};
