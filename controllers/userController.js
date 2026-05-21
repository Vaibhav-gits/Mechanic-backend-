const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const DEFAULT_EXPENSES = [
  "Product Purchase",
  "Rent",
  "Electricity",
  "Internet",
  "Phone Bills",
  "Insurance",
  "Software Subscription",
  "Equipment Maintenance",
  "Marketing & Advertising",
  "Training",
  "Furniture",
  "Decor",
  "Taxes & Permits",
  "Commission Payments",
];

const DEFAULT_CATEGORIES = [
  "Oil Change & Lubrication",
  "Engine Services",
  "Brake Services",
  "Tyre Services",
  "Battery Services",
  "Electrical Services",
  "AC & Cooling Services",
  "Suspension & Steering",
  "Transmission Services",
  "Body & Paint Services",
  "Washing & Cleaning",
  "Wheel Alignment & Balancing",
  "Inspection & Diagnostics",
];

const getDefaultCurrencyId = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT id FROM currencies WHERE is_deleted = 0 LIMIT 1",
      (err, result) => {
        if (err) return reject(err);
        resolve(result[0]?.id || null);
      },
    );
  });
};

const ensureDefaultSetting = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      db.query(
        "SELECT id FROM settings WHERE user_id = ? AND is_deleted = 0 LIMIT 1",
        [userId],
        async (err, existing) => {
          if (err) return reject(err);
          if (existing.length > 0) return resolve();

          const currencyId = await getDefaultCurrencyId();

          db.query(
            `INSERT INTO settings (id, user_id, currency_id, country_id, is_deleted, created_at)
             VALUES (UUID(), ?, ?, NULL, 0, NOW())`,
            [userId, currencyId],
            (err) => {
              if (err) return reject(err);
              resolve();
            },
          );
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};

const ensureDefaultExpenses = (userId) => {
  return new Promise((resolve, reject) => {
    const checkSql =
      "SELECT id FROM default_expenses WHERE user_id = ? AND is_deleted = 0 LIMIT 1";
    db.query(checkSql, [userId], (err, existing) => {
      if (err) return reject(err);
      if (existing.length > 0) return resolve();

      const values = DEFAULT_EXPENSES.map((name) => [
        uuidv4(),
        name,
        userId,
        1,
        0,
        new Date(),
      ]);
      const sql =
        "INSERT INTO default_expenses (id, name, user_id, is_default, is_deleted, created_at) VALUES ?";
      db.query(sql, [values], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

const ensureDefaultCategories = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (const name of DEFAULT_CATEGORIES) {
        const existing = await new Promise((res, rej) => {
          db.query(
            "SELECT id FROM categories WHERE user_id = ? AND name = ? AND is_deleted = 0 LIMIT 1",
            [userId, name],
            (err, rows) => (err ? rej(err) : res(rows)),
          );
        });

        if (existing.length === 0) {
          await new Promise((res, rej) => {
            db.query(
              "INSERT INTO categories (id, name, user_id, status_id, created_by, is_default, is_deleted, created_at) VALUES (?, ?, ?, 1, ?, 1, 0, ?)",
              [uuidv4(), name, userId, userId, new Date()],
              (err) => (err ? rej(err) : res()),
            );
          });
        }
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

exports.signup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  try {
    if (!name || !email || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Passwords do not match" });
    }

    db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()],
      async (err, existing) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });

        if (existing.length > 0 && existing[0].is_deleted === 0) {
          return res
            .status(400)
            .json({ isSuccess: false, message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = new Date();

        if (existing.length > 0 && existing[0].is_deleted === 1) {
          const sql =
            "UPDATE users SET name=?, password=?, is_deleted=0, is_new=1, updated_at=? WHERE email=?";
          db.query(
            sql,
            [name, hashedPassword, now, email.toLowerCase()],
            async (err) => {
              if (err)
                return res
                  .status(500)
                  .json({ isSuccess: false, message: err.message });
              const reactivatedUser = existing[0];
              await afterRegister(
                reactivatedUser.id,
                reactivatedUser.name,
                reactivatedUser.email,
                res,
              );
            },
          );
        } else {
          const sql = `INSERT INTO users (id, name, email, password, is_new, is_default, is_deleted, created_at)
                     VALUES (?, ?, ?, ?, 1, 0, 0, ?)`;
          db.query(
            sql,
            [userId, name, email.toLowerCase(), hashedPassword, now],
            async (err) => {
              if (err)
                return res
                  .status(500)
                  .json({ isSuccess: false, message: err.message });
              try {
                await afterRegister(userId, name, email.toLowerCase(), res);
              } catch (e) {
                return res
                  .status(500)
                  .json({ isSuccess: false, message: e.message });
              }
            },
          );
        }
      },
    );
  } catch (error) {
    res.status(500).json({ isSuccess: false, message: error.message });
  }
};

const afterRegister = async (userId, name, email, res) => {
  try {
    await ensureDefaultExpenses(userId);
    await ensureDefaultCategories(userId);
    await ensureDefaultSetting(userId);

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      isSuccess: true,
      message: "User registered successfully",
      response: {
        user: { id: userId, name, email, isNew: true, isDefault: false },
        token: { accessToken: token },
      },
    });
  } catch (error) {
    res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    db.query(
      "SELECT * FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1",
      [email.toLowerCase()],
      async (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        if (result.length === 0)
          return res
            .status(400)
            .json({ isSuccess: false, message: "User not found" });

        const user = result[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
          return res
            .status(400)
            .json({ isSuccess: false, message: "Invalid password" });

        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );

        await ensureDefaultExpenses(user.id);
        await ensureDefaultCategories(user.id);
        await ensureDefaultSetting(user.id);

        res.json({
          isSuccess: true,
          message: "Login successful",
          response: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              isNew: user.is_new === 1,
              isDefault: user.is_default === 1,
              countryCode: user.country_code || null,
            },
            token: { accessToken: token },
          },
        });
      },
    );
  } catch (error) {
    res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.deleteUser = (req, res) => {
  const { Id } = req.query;
  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  db.query("UPDATE users SET is_deleted = 1 WHERE id = ?", [Id], (err) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    res.json({ isSuccess: true, message: "User deleted successfully" });
  });
};

exports.getCurrentUserById = (req, res) => {
  const { Id } = req.query;
  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  db.query(
    "SELECT id, name, email, is_new, is_default, country_code FROM users WHERE id = ? AND is_deleted = 0",
    [Id],
    (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (result.length === 0)
        return res
          .status(400)
          .json({ isSuccess: false, message: "User not found" });

      const user = result[0];
      res.json({
        isSuccess: true,
        response: {
          id: user.id,
          name: user.name,
          email: user.email,
          isNew: user.is_new === 1,
          isDefault: user.is_default === 1,
          countryCode: user.country_code || null,
        },
      });
    },
  );
};

exports.changePassword = async (req, res) => {
  const { userId, oldPassword, newPassword, confirmPassword } = req.body;
  try {
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ isSuccess: false, message: "Passwords do not match" });
    }

    db.query(
      "SELECT * FROM users WHERE id = ? AND is_deleted = 0",
      [userId],
      async (err, result) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        if (result.length === 0)
          return res
            .status(400)
            .json({ isSuccess: false, message: "User not found" });

        const user = result[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch)
          return res
            .status(400)
            .json({ isSuccess: false, message: "Old password is incorrect" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, userId],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });
            res.json({
              isSuccess: true,
              message: "Password changed successfully",
            });
          },
        );
      },
    );
  } catch (error) {
    res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.editProfile = async (req, res) => {
  const { userId, name, phoneNumber, countryCode, profilePhotoUrl } = req.body;
  try {
    const sql =
      "UPDATE users SET name=?, phone_number=?, country_code=?, profile_photo_url=?, updated_at=? WHERE id=? AND is_deleted=0";
    db.query(
      sql,
      [
        name,
        phoneNumber || null,
        countryCode || null,
        profilePhotoUrl || null,
        new Date(),
        userId,
      ],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        res.json({ isSuccess: true, message: "Profile updated successfully" });
      },
    );
  } catch (error) {
    res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.getSubscriptionStatus = (req, res) => {
  const userId = req.query.Id || req.user?.id;

  if (!userId)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required" });

  const sql =
    "SELECT * FROM user_subscriptions WHERE user_id = ? AND is_active = 1 LIMIT 1";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.json({
          isSuccess: true,
          statusCode: 200,
          message: "No subscription found",
          response: { isSubscribed: false },
        });
      }
      return res.status(500).json({ isSuccess: false, message: err.message });
    }

    if (!result || result.length === 0) {
      return res.json({
        isSuccess: true,
        statusCode: 200,
        message: "Not subscribed",
        response: { isSubscribed: false },
      });
    }

    const sub = result[0];
    res.json({
      isSuccess: true,
      statusCode: 200,
      message: "Subscription found",
      response: {
        isSubscribed: true,
        planId: sub.plan_id || null,
        expiryDate: sub.expiry_date || null,
      },
    });
  });
};
