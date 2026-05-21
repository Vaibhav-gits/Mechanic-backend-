const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const isValidEmail = (email) => {
  const pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return pattern.test(email);
};


const ensureFirstStaffIsDefault = (userId, callback) => {
  const sql = `SELECT * FROM staffs 
               WHERE user_id = ? AND is_default = 0 AND is_deleted = 0 
               ORDER BY created_at ASC LIMIT 1`;
  db.query(sql, [userId], (err, result) => {
    if (err) return callback(err);
    if (result.length > 0 && result[0].is_default_staff !== 1) {
      db.query('UPDATE staffs SET is_default_staff = 1 WHERE id = ?', [result[0].id], (err) => {
        callback(err);
      });
    } else {
      callback(null);
    }
  });
};

exports.addStaff = (req, res) => {
  const userId = req.user?.id;
  const { name, gender, mobile, email, dob, joiningDate, salary, address, statusId } = req.body;

  if (!name) return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Name is required.'] });
  if (!mobile) return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Mobile is required.'] });
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Invalid email format.'] });
  }

  const newId = uuidv4();
  const sql = `INSERT INTO staffs 
               (id, name, gender, mobile, email, dob, joining_date, salary, address, 
                status_id, user_id, created_by, is_default, is_default_staff, is_deleted, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`;

  db.query(sql, [
    newId, name, gender || null, mobile, email || null,
    dob || null, joiningDate || null, salary || null,
    address || null, statusId || 1, userId, userId, new Date()
  ], (err) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: 'Staff added successfully',
      response: {
        staffVM: {
          id: newId, name, gender, mobile, email, dob,
          joiningDate, salary, address, statusId: statusId || 1,
          userId, isDefault: false, isDefaultStaff: false,
        },
      },
    });
  });
};


exports.updateStaff = (req, res) => {
  const userId = req.user?.id;
  const { id, name, gender, mobile, email, dob, joiningDate, salary, address, statusId } = req.body;

  if (!id) return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Id is required for updating data'] });
  if (!name) return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Name is required.'] });
  if (!mobile) return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Mobile is required.'] });
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ isSuccess: false, statusCode: 400, errors: ['Invalid email format.'] });
  }

  const findSql = 'SELECT * FROM staffs WHERE id = ? AND is_deleted = 0 LIMIT 1';
  db.query(findSql, [id], (err, existing) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });
    if (existing.length === 0) {
      return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
    }

    const updateSql = `UPDATE staffs SET name=?, gender=?, mobile=?, email=?, dob=?,
                       joining_date=?, salary=?, address=?, status_id=?, user_id=?, updated_at=?
                       WHERE id=?`;
    db.query(updateSql, [
      name, gender || null, mobile, email || null,
      dob || null, joiningDate || null, salary || null,
      address || null, statusId || 1, userId, new Date(), id
    ], (err) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: 'Staff updated successfully',
        response: {
          staffVM: {
            id, name, gender, mobile, email, dob,
            joiningDate, salary, address, statusId: statusId || 1,
            userId, isDefault: existing[0].is_default,
            isDefaultStaff: existing[0].is_default_staff,
          },
        },
      });
    });
  });
};

exports.deleteStaff = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id) return res.status(400).json({ isSuccess: false, message: 'Id is required' });


  const adminCheckSql = `SELECT * FROM staffs 
                         WHERE id = ? AND user_id = ? AND is_default_staff = 1 
                         AND is_default = 0 AND is_deleted = 0 LIMIT 1`;
  db.query(adminCheckSql, [Id, userId], (err, adminResult) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });
    if (adminResult.length > 0) {
      return res.status(409).json({
        isSuccess: false,
        statusCode: 409,
        errors: ['Default admin staff cannot be deleted.'],
      });
    }

   
    const findSql = `SELECT * FROM staffs 
                     WHERE id = ? AND user_id = ? AND is_default_staff = 0 AND is_deleted = 0 LIMIT 1`;
    db.query(findSql, [Id, userId], (err, existing) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      db.query('UPDATE staffs SET is_deleted = 1 WHERE id = ?', [Id], (err) => {
        if (err) return res.status(500).json({ isSuccess: false, message: err.message });

        res.json({
          isSuccess: true,
          statusCode: 200,
          message: 'Staff deleted successfully',
          response: null,
        });
      });
    });
  });
};


exports.getAllStaff = (req, res) => {
  const userId = req.user?.id;

  ensureFirstStaffIsDefault(userId, (err) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    const sql = `SELECT id, name, gender, mobile, email, dob, joining_date AS joiningDate,
                        salary, address, status_id AS statusId, user_id AS userId,
                        is_default AS isDefault, is_default_staff AS isDefaultStaff,
                        created_at AS createdAt
                 FROM staffs
                 WHERE user_id = ? AND is_deleted = 0
                 ORDER BY created_at ASC`;

    db.query(sql, [userId], (err, result) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      if (result.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${result.length} ${result.length > 1 ? 'Staffs' : 'Staff'} found.`,
        totalRecords: result.length,
        response: result,
      });
    });
  });
};


exports.getByIdStaff = (req, res) => {
  const userId = req.user?.id;
  const { Id } = req.query;

  if (!Id) return res.status(400).json({ isSuccess: false, message: 'Id is required' });

  ensureFirstStaffIsDefault(userId, (err) => {
    if (err) return res.status(500).json({ isSuccess: false, message: err.message });

    const sql = `SELECT id, name, gender, mobile, email, dob, joining_date AS joiningDate,
                        salary, address, status_id AS statusId, user_id AS userId,
                        is_default AS isDefault, is_default_staff AS isDefaultStaff,
                        created_at AS createdAt
                 FROM staffs
                 WHERE id = ? AND user_id = ? AND is_deleted = 0 LIMIT 1`;

    db.query(sql, [Id, userId], (err, result) => {
      if (err) return res.status(500).json({ isSuccess: false, message: err.message });

      if (result.length === 0) {
        return res.status(204).json({ isSuccess: false, errors: ['Not found'] });
      }

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: 'Staff record found.',
        response: { staffVM: result[0] },
      });
    });
  });
};