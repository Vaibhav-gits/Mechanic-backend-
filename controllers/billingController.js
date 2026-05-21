const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// POST /api/salon/billing/addBill
exports.addBill = (req, res) => {
  const userId = req.user?.id;
  const {
    customerId,
    staffId,
    serviceIds,
    totalAmount,
    discountAmount,
    taxAmount,
    taxPercent,
    paidAmount,
    pendingAmount,
    paymentMethod,
    billingDate,
    notes,
    taxId,
    vehicleType,
    extraCharges,
    isFullPayment,
  } = req.body;

  if (!totalAmount) {
    return res.status(400).json({
      isSuccess: false,
      message: "totalAmount is required.",
    });
  }

  const newId = uuidv4();
  const sql = `
    INSERT INTO billings
      (id, user_id, customer_id, staff_id, tax_id,
       total_amount, discount, extra_charges, tax_amount, tax_percent,
       paid_amount, pending_amount, is_full_payment,
       payment_method, billing_date, notes,
       vehicle_type, is_deleted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `;

  db.query(
    sql,
    [
      newId,
      userId,
      customerId,
      staffId || null,
      taxId || null,
      totalAmount,
      discountAmount || 0,
      extraCharges || 0,
      taxAmount || 0,
      taxPercent || 0,
      paidAmount || 0,
      pendingAmount || 0,
      isFullPayment ? 1 : 0,
      paymentMethod || null,
      billingDate || new Date(),
      notes || null,
      vehicleType || 1,
      new Date(),
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ isSuccess: false, message: err.message });
      }

      if (serviceIds && serviceIds.length > 0) {
        const serviceValues = serviceIds.map((sId) => [uuidv4(), newId, sId]);
        db.query(
          "INSERT INTO billing_services (id, billing_id, service_id) VALUES ?",
          [serviceValues],
          (err) => {
            if (err) {
              return res
                .status(500)
                .json({ isSuccess: false, message: err.message });
            }
            return res.json({
              isSuccess: true,
              statusCode: 200,
              message: "Bill added successfully.",
              response: { id: newId },
            });
          },
        );
      } else {
        res.json({
          isSuccess: true,
          statusCode: 200,
          message: "Bill added successfully.",
          response: { id: newId },
        });
      }
    },
  );
};

// PUT /api/salon/billing/updateBill
exports.updateBill = (req, res) => {
  const {
    id,
    customerId,
    staffId,
    totalAmount,
    discountAmount,
    taxAmount,
    paidAmount,
    pendingAmount,
    paymentMethod,
    billingDate,
    date,
    notes,
    taxId,
    vehicleType,
  } = req.body;

  if (!id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  db.query(
    "SELECT * FROM billings WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0) {
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      }

      const b = existing[0];
      db.query(
        `UPDATE billings SET customer_id = ?, staff_id = ?, total_amount = ?, discount_amount = ?,
         tax_amount = ?, paid_amount = ?, pending_amount = ?, payment_method = ?,
         billing_date = ?, notes = ?, tax_id = ?, vehicle_type = ?, updated_at = ? WHERE id = ?`,
        [
          customerId || b.customer_id,
          staffId || b.staff_id,
          totalAmount !== undefined ? totalAmount : b.total_amount,
          discountAmount !== undefined ? discountAmount : b.discount_amount,
          taxAmount !== undefined ? taxAmount : b.tax_amount,
          paidAmount !== undefined ? paidAmount : b.paid_amount,
          pendingAmount !== undefined ? pendingAmount : b.pending_amount,
          paymentMethod || b.payment_method,
          billingDate || b.billing_date,
          notes || b.notes,
          taxId || b.tax_id,
          vehicleType !== undefined ? vehicleType : b.vehicle_type,
          new Date(),
          id,
        ],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });
          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Bill updated successfully.",
            response: { id },
          });
        },
      );
    },
  );
};

// GET /api/salon/billing/getBillingById?Id=xxx
exports.getBillingById = (req, res) => {
  const { Id } = req.query;
  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  const sql = `
    SELECT b.id, b.user_id AS userId, b.customer_id AS customerId,
           c.name AS customerName, b.staff_id AS staffId, st.name AS staffName,
           b.total_amount AS totalAmount, b.discount_amount AS discountAmount,
           b.tax_amount AS taxAmount, b.paid_amount AS paidAmount,
           b.pending_amount AS pendingAmount, b.payment_method AS paymentMethod,
           b.billing_date AS billingDate, b.notes, b.tax_id AS taxId,
           t.name AS taxName, t.percentage AS taxPercentage,
           b.vehicle_type AS vehicleType,
           b.created_at AS createdAt
    FROM billings b
    LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
    LEFT JOIN staffs st   ON st.id = b.staff_id   AND st.is_deleted = 0
    LEFT JOIN taxes t     ON t.id = b.tax_id      AND t.is_deleted = 0
    WHERE b.id = ? AND b.is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [Id], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (result.length === 0)
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });

    db.query(
      `SELECT bs.service_id AS serviceId, s.name AS serviceName, s.price
       FROM billing_services bs
       LEFT JOIN services s ON s.id = bs.service_id AND s.is_deleted = 0
       WHERE bs.billing_id = ?`,
      [Id],
      (err, services) => {
        if (err)
          return res
            .status(500)
            .json({ isSuccess: false, message: err.message });
        const billing = result[0];
        billing.services = services;
        res.json({
          isSuccess: true,
          statusCode: 200,
          message: "Billing record found.",
          response: billing,
        });
      },
    );
  });
};

// POST /api/salon/billing/getAllBilling
exports.getAllBilling = (req, res) => {
  const userId = req.user?.id;
  const { pageNumber, pageSize, fromDate, toDate, customerId } = req.body;

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 15;
  const offset = (page - 1) * limit;

  let whereClauses = ["b.user_id = ?", "b.is_deleted = 0"];
  let params = [userId];

  if (fromDate) {
    whereClauses.push("b.billing_date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    whereClauses.push("b.billing_date <= ?");
    params.push(toDate);
  }
  if (customerId) {
    whereClauses.push("b.customer_id = ?");
    params.push(customerId);
  }

  const where = whereClauses.join(" AND ");

  const summarySql = `
    SELECT 
      COALESCE(SUM(b.total_amount), 0) AS total,
      COALESCE(SUM(b.paid_amount), 0) AS totalBalance,
      COUNT(CASE WHEN b.vehicle_type = 1 THEN 1 END) AS male,
      COUNT(CASE WHEN b.vehicle_type = 2 THEN 1 END) AS female,
      COALESCE(SUM(CASE WHEN b.payment_method = 'Cash' 
        THEN b.paid_amount ELSE 0 END), 0) AS cashAmount,
      COALESCE(SUM(CASE WHEN b.payment_method != 'Cash' 
        THEN b.paid_amount ELSE 0 END), 0) AS eTransferAmount
    FROM billings b
    WHERE ${where}
  `;

  const dataSql = `
    SELECT 
      b.id,
      c.name AS name,
      b.customer_id AS customerId,
      b.total_amount AS billingAmountWithTax,
      b.discount AS discountAmount,
      b.tax_amount AS taxAmount,
      b.paid_amount AS paidAmount,
      b.pending_amount AS pendingAmount,
      b.payment_method AS paymentMethod,
      b.billing_date AS date,
      b.notes,
      b.vehicle_type AS vehicleType,
      b.created_at AS createdAt
    FROM billings b
    LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
    WHERE ${where}
    ORDER BY b.billing_date DESC
    LIMIT ? OFFSET ?
  `;

  db.query(summarySql, params, (err, summaryResult) => {
    if (err) {
      return res.status(500).json({ isSuccess: false, message: err.message });
    }

    db.query(dataSql, [...params, limit, offset], (err, result) => {
      if (err) {
        return res.status(500).json({ isSuccess: false, message: err.message });
      }

      const summary = summaryResult[0];

      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${result.length} records found.`,
        response: {
          billingList: result,
          total: parseFloat(summary.total).toFixed(2),
          totalBalance: parseFloat(summary.totalBalance).toFixed(2),
          male: String(summary.male).padStart(2, "0"),
          female: String(summary.female).padStart(2, "0"),
          cashAmount: parseFloat(summary.cashAmount).toFixed(2),
          eTransferAmount: parseFloat(summary.eTransferAmount).toFixed(2),
          totalRecords: result.length,
        },
      });
    });
  });
};

// POST /api/salon/billing/getAllBillingHistory
exports.getAllBillingHistory = (req, res) => {
  const userId = req.user?.id;
  const { customerId, pageNumber, pageSize } = req.body;

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (page - 1) * limit;

  let whereClauses = ["b.user_id = ?", "b.is_deleted = 0"];
  let params = [userId];

  if (customerId) {
    whereClauses.push("b.customer_id = ?");
    params.push(customerId);
  }

  const where = whereClauses.join(" AND ");

  const sql = `
    SELECT b.id, b.customer_id AS customerId, c.name AS customerName,
           b.total_amount AS totalAmount, b.paid_amount AS paidAmount,
           b.pending_amount AS pendingAmount, b.billing_date AS billingDate,
           b.payment_method AS paymentMethod, b.created_at AS createdAt
    FROM billings b
    LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
    WHERE ${where}
    ORDER BY b.billing_date DESC
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [...params, limit, offset], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (result.length === 0)
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} records found.`,
      response: result,
    });
  });
};

// DELETE /api/salon/billing/deleteBilling?Id=xxx
exports.deleteBilling = (req, res) => {
  const { Id } = req.query;
  if (!Id)
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id is required." });

  db.query(
    "SELECT * FROM billings WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [Id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0)
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });

      db.query(
        "UPDATE billings SET is_deleted = 1 WHERE id = ?",
        [Id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });
          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Billing deleted successfully.",
            response: null,
          });
        },
      );
    },
  );
};

exports.getAllIncome = (req, res) => {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ isSuccess: false, message: "Unauthorized" });

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 6);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const getIncome = (start, end) =>
    new Promise((resolve, reject) => {
      const sql = `
      SELECT 
        COALESCE(SUM(total_amount), 0) AS amount,
        COUNT(CASE WHEN vehicle_type = 1 THEN 1 END) AS twoWheeler,
        COUNT(CASE WHEN vehicle_type = 2 THEN 1 END) AS fourWheeler
      FROM billings
      WHERE user_id = ? AND is_deleted = 0
        AND billing_date >= ? AND billing_date <= ?
    `;
      db.query(sql, [userId, start, end], (err, result) => {
        if (err) return reject(err);
        resolve(result[0]);
      });
    });

  const getRecentBilling = () =>
    new Promise((resolve, reject) => {
      const sql = `
      SELECT 
        c.name AS customerName,
        CASE 
          WHEN b.vehicle_type = 1 THEN 'Male'
          WHEN b.vehicle_type = 2 THEN 'Female'
          ELSE 'Male'
        END AS genderName,
        b.total_amount AS amount
      FROM billings b
      LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
      WHERE b.user_id = ? AND b.is_deleted = 0
      ORDER BY b.created_at DESC
      LIMIT 5
    `;
      db.query(sql, [userId], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

  const getRecentServices = () =>
    new Promise((resolve, reject) => {
      const sql = `
      SELECT 
        s.name AS serviceName,
        COALESCE(SUM(b.total_amount), 0) AS amount,
        ROUND(
          COALESCE(SUM(b.total_amount), 0) * 100.0 / 
          NULLIF((
            SELECT SUM(total_amount) FROM billings 
            WHERE user_id = ? AND is_deleted = 0
              AND MONTH(billing_date) = MONTH(NOW()) 
              AND YEAR(billing_date) = YEAR(NOW())
          ), 0)
        , 2) AS value
      FROM billing_services bs
      LEFT JOIN services s ON s.id = bs.service_id AND s.is_deleted = 0
      LEFT JOIN billings b ON b.id = bs.billing_id 
        AND b.user_id = ? AND b.is_deleted = 0
        AND MONTH(b.billing_date) = MONTH(NOW()) 
        AND YEAR(b.billing_date) = YEAR(NOW())
      GROUP BY s.id, s.name
      ORDER BY amount DESC
      LIMIT 5
    `;
      db.query(sql, [userId, userId], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

  const getCount = (start, end) =>
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) AS total FROM billings 
       WHERE user_id = ? AND is_deleted = 0 
         AND billing_date >= ? AND billing_date <= ?`,
        [userId, start, end],
        (err, result) => {
          if (err) return reject(err);
          resolve(result[0].total);
        },
      );
    });

  Promise.all([
    getIncome(todayStart, todayEnd),
    getIncome(yesterdayStart, yesterdayEnd),
    getIncome(weekStart, todayEnd),
    getIncome(monthStart, todayEnd),
    getIncome(yearStart, todayEnd),
    getRecentBilling(),
    getRecentServices(),
    getCount(lastWeekStart, lastWeekEnd),
    getCount(lastMonthStart, lastMonthEnd),
    getCount(weekStart, todayEnd),
    getCount(monthStart, todayEnd),
  ])
    .then(
      ([
        today,
        yesterday,
        thisWeek,
        thisMonth,
        thisYear,
        recentBillingList,
        recentServiceList,
        lastWeekCount,
        lastMonthCount,
        thisWeekCount,
        thisMonthCount,
      ]) => {
        const calcPerf = (curr, prev) => {
          if (prev === 0) return curr > 0 ? 100 : 0;
          return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
        };

        const pad = (n) => String(n).padStart(2, "0");

        res.json({
          isSuccess: true,
          statusCode: 200,
          message: "Income data found.",
          response: {
            todayIncome: {
              period: "Today",
              amount: parseFloat(today.amount),
              male: pad(today.twoWheeler),
              female: pad(today.fourWheeler),
            },
            incomeList: [
              {
                period: "Yesterday",
                amount: parseFloat(yesterday.amount),
                male: pad(yesterday.twoWheeler),
                female: pad(yesterday.fourWheeler),
              },
              {
                period: "This Week",
                amount: parseFloat(thisWeek.amount),
                male: pad(thisWeek.twoWheeler),
                female: pad(thisWeek.fourWheeler),
              },
              {
                period: "This Month",
                amount: parseFloat(thisMonth.amount),
                male: pad(thisMonth.twoWheeler),
                female: pad(thisMonth.fourWheeler),
              },
              {
                period: "This Year",
                amount: parseFloat(thisYear.amount),
                male: pad(thisYear.twoWheeler),
                female: pad(thisYear.fourWheeler),
              },
            ],
            recentBillingList,
            recentServiceList,
            totalWeekPerformance: calcPerf(thisWeekCount, lastWeekCount),
            totalMonthPerformance: calcPerf(thisMonthCount, lastMonthCount),
          },
        });
      },
    )
    .catch((err) => {
      res.status(500).json({ isSuccess: false, message: err.message });
    });
};

// POST /api/salon/billing/getBillingByCustomerId
exports.getBillingByCustomerId = (req, res) => {
  const userId = req.user?.id;
  const { customerId, pageNumber, pageSize } = req.body;

  if (!customerId)
    return res
      .status(400)
      .json({ isSuccess: false, message: "CustomerId is required." });

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT b.id, b.customer_id AS customerId, c.name AS customerName,
           b.total_amount AS totalAmount, b.paid_amount AS paidAmount,
           b.pending_amount AS pendingAmount, b.billing_date AS billingDate,
           b.payment_method AS paymentMethod, b.created_at AS createdAt
    FROM billings b
    LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
    WHERE b.user_id = ? AND b.customer_id = ? AND b.is_deleted = 0
    ORDER BY b.billing_date DESC
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [userId, customerId, limit, offset], (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });
    if (result.length === 0)
      return res.status(204).json({ isSuccess: false, errors: ["Not found"] });

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} records found.`,
      response: result,
    });
  });
};

// POST /api/salon/billing/getAllBalanceAmount
exports.getAllBalanceAmount = (req, res) => {
  const userId = req.user?.id;
  const { startDate, endDate } = req.body;

  let whereClauses = ["user_id = ?", "is_deleted = 0"];
  let params = [userId];

  if (startDate) {
    whereClauses.push("billing_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("billing_date <= ?");
    params.push(endDate);
  }

  const where = whereClauses.join(" AND ");

  db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalAmount,
            COALESCE(SUM(paid_amount), 0) AS paidAmount,
            COALESCE(SUM(pending_amount), 0) AS pendingAmount
     FROM billings WHERE ${where}`,
    params,
    (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      res.json({
        isSuccess: true,
        statusCode: 200,
        message: "Balance amount data found.",
        response: result[0],
      });
    },
  );
};

// PUT /api/salon/billing/updatePendingBalance
exports.updatePendingBalance = (req, res) => {
  const { id, paidAmount } = req.body;
  if (!id || paidAmount === undefined) {
    return res
      .status(400)
      .json({ isSuccess: false, message: "Id and paidAmount are required." });
  }

  db.query(
    "SELECT * FROM billings WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id],
    (err, existing) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (existing.length === 0)
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });

      const bill = existing[0];
      const newPaid = parseFloat(bill.paid_amount) + parseFloat(paidAmount);
      const newPending = Math.max(0, parseFloat(bill.total_amount) - newPaid);

      db.query(
        "UPDATE billings SET paid_amount = ?, pending_amount = ?, updated_at = ? WHERE id = ?",
        [newPaid, newPending, new Date(), id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ isSuccess: false, message: err.message });
          res.json({
            isSuccess: true,
            statusCode: 200,
            message: "Pending balance updated.",
            response: { id, paidAmount: newPaid, pendingAmount: newPending },
          });
        },
      );
    },
  );
};

// POST /api/salon/billing/getAllMostEarning
exports.getAllMostEarning = (req, res) => {
  const userId = req.user?.id;
  const { fromDate, toDate, pageNumber, pageSize } = req.body;

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 20;
  const offset = (page - 1) * limit;

  let dateWhere = "";
  let subParams = [userId];
  let mainParams = [userId];

  if (fromDate) {
    dateWhere += " AND b.billing_date >= ?";
    subParams.push(fromDate);
    mainParams.push(fromDate);
  }
  if (toDate) {
    dateWhere += " AND b.billing_date <= ?";
    subParams.push(toDate);
    mainParams.push(toDate);
  }

  const sql = `
    SELECT 
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(b.total_amount), 0) DESC) AS rowNum,
      s.id AS serviceId,
      s.name AS serviceName,
      COUNT(b.id) AS totalEntries,
      COALESCE(SUM(b.total_amount), 0) AS totalAmount,
      ROUND(
        COALESCE(SUM(b.total_amount), 0) * 100.0 /
        NULLIF((
          SELECT SUM(b2.total_amount) 
          FROM billings b2
          INNER JOIN billing_services bs2 ON bs2.billing_id = b2.id AND bs2.is_deleted = 0
          WHERE b2.user_id = ? AND b2.is_deleted = 0 ${dateWhere}
        ), 0)
      , 2) AS value
    FROM billing_services bs
    INNER JOIN services s ON s.id = bs.service_id AND s.is_deleted = 0
    INNER JOIN billings b ON b.id = bs.billing_id 
      AND b.user_id = ? AND b.is_deleted = 0 ${dateWhere}
    WHERE bs.is_deleted = 0
    GROUP BY s.id, s.name
    ORDER BY totalAmount DESC
    LIMIT ? OFFSET ?
  `;

  const allParams = [...subParams, ...mainParams, limit, offset];

  db.query(sql, allParams, (err, result) => {
    if (err) {
      return res.status(500).json({ isSuccess: false, message: err.message });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} records found.`,
      response: {
        list: result,
        totalRecords: result.length,
      },
    });
  });
};

// POST /api/salon/billing/getBillingReportByStaffId
exports.getBillingReportByStaffId = (req, res) => {
  const userId = req.user?.id;
  const { staffId, startDate, endDate, pageNumber, pageSize } = req.body;

  if (!staffId)
    return res
      .status(400)
      .json({ isSuccess: false, message: "StaffId is required." });

  const page = parseInt(pageNumber) || 1;
  const limit = parseInt(pageSize) || 10;
  const offset = (page - 1) * limit;

  let whereClauses = ["b.user_id = ?", "b.staff_id = ?", "b.is_deleted = 0"];
  let params = [userId, staffId];

  if (startDate) {
    whereClauses.push("b.billing_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("b.billing_date <= ?");
    params.push(endDate);
  }

  const where = whereClauses.join(" AND ");

  db.query(
    `SELECT b.id, b.customer_id AS customerId, c.name AS customerName,
            b.total_amount AS totalAmount, b.paid_amount AS paidAmount,
            b.billing_date AS billingDate, b.payment_method AS paymentMethod
     FROM billings b
     LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
     WHERE ${where}
     ORDER BY b.billing_date DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
    (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (result.length === 0)
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${result.length} records found.`,
        response: result,
      });
    },
  );
};

// GET /api/salon/billing/getAllPricingPlan
exports.getAllPricingPlan = (req, res) => {
  db.query(
    `SELECT id, name, price, description, duration_days AS durationDays, is_active AS isActive
     FROM pricing_plans WHERE is_deleted = 0 ORDER BY price ASC`,
    (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (result.length === 0)
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["Not found"] });
      res.json({
        isSuccess: true,
        statusCode: 200,
        message: `Total ${result.length} plans found.`,
        response: result,
      });
    },
  );
};

// POST /api/salon/billing/getBillingWorkReport
exports.getBillingWorkReport = (req, res) => {
  const userId = req.user?.id;
  const { startDate, endDate } = req.body;

  let whereClauses = ["b.user_id = ?", "b.is_deleted = 0"];
  let params = [userId];

  if (startDate) {
    whereClauses.push("b.billing_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("b.billing_date <= ?");
    params.push(endDate);
  }

  const where = whereClauses.join(" AND ");

  db.query(
    `SELECT b.id, c.name AS customerName, st.name AS staffName,
            b.total_amount AS totalAmount, b.discount_amount AS discountAmount,
            b.tax_amount AS taxAmount, b.paid_amount AS paidAmount,
            b.pending_amount AS pendingAmount, b.payment_method AS paymentMethod,
            b.billing_date AS billingDate, b.notes
     FROM billings b
     LEFT JOIN customers c ON c.id = b.customer_id AND c.is_deleted = 0
     LEFT JOIN staffs st   ON st.id = b.staff_id   AND st.is_deleted = 0
     WHERE ${where}
     ORDER BY b.billing_date DESC`,
    params,
    (err, result) => {
      if (err)
        return res.status(500).json({ isSuccess: false, message: err.message });
      if (result.length === 0)
        return res
          .status(204)
          .json({ isSuccess: false, errors: ["No data to export"] });

      try {
        const ExcelJS = require("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Billing Work Report");

        worksheet.columns = [
          { header: "Customer", key: "customerName", width: 20 },
          { header: "Staff", key: "staffName", width: 20 },
          { header: "Total Amount", key: "totalAmount", width: 15 },
          { header: "Discount", key: "discountAmount", width: 15 },
          { header: "Tax", key: "taxAmount", width: 10 },
          { header: "Paid", key: "paidAmount", width: 15 },
          { header: "Pending", key: "pendingAmount", width: 15 },
          { header: "Payment Method", key: "paymentMethod", width: 18 },
          { header: "Billing Date", key: "billingDate", width: 18 },
          { header: "Notes", key: "notes", width: 25 },
        ];

        result.forEach((row) => worksheet.addRow(row));

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=BillingWorkReport.xlsx",
        );
        workbook.xlsx.write(res).then(() => res.end());
      } catch (exErr) {
        res.status(500).json({
          isSuccess: false,
          message: "Excel generation failed: " + exErr.message,
        });
      }
    },
  );
};
