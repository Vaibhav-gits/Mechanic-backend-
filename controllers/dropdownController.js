const db = require("../config/db");

exports.getAllDropdowns = (req, res) => {
  const userId = req.user?.id;

  const currencyQuery = `
    SELECT id, name, symbol AS extra1 
    FROM currencies 
    WHERE is_deleted = 0 
    ORDER BY name ASC
  `;

  const countryQuery = `
    SELECT id, name, iso2 AS extra1 
    FROM master_countries 
    ORDER BY name ASC
  `;

  let completed = 0;
  let hasError = false;
  const results = {};

  const handleComplete = () => {
    completed++;
    if (completed === 2) {
      res.json({
        isSuccess: true,
        statusCode: 200,
        message: "Dropdowns fetched successfully.",
        response: results,
      });
    }
  };

  db.query(currencyQuery, (err, rows) => {
    if (hasError) return;
    if (err) {
      hasError = true;

      return res.status(500).json({ isSuccess: false, message: err.message });
    }
    results.currencyDropdown = rows;
    handleComplete();
  });

  db.query(countryQuery, (err, rows) => {
    if (hasError) return;
    if (err) {
      hasError = true;

      return res.status(500).json({ isSuccess: false, message: err.message });
    }
    results.countryDropdown = rows;
    handleComplete();
  });
};

exports.getCountryDropdown = (req, res) => {
  const sql = `
    SELECT 
      id, 
      name,
      phone_code AS extra1,
      '10' AS extra2
    FROM master_countries
    ORDER BY name ASC
  `;

  db.query(sql, (err, result) => {
    if (err)
      return res.status(500).json({ isSuccess: false, message: err.message });

    if (!result || result.length === 0) {
      return res
        .status(404)
        .json({ isSuccess: false, message: "No country data found." });
    }

    res.json({
      isSuccess: true,
      statusCode: 200,
      message: `Total ${result.length} countries found.`,
      response: result,
    });
  });
};
