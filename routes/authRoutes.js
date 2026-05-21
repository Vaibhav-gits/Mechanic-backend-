const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

// ─── User ──
const userController = require("../controllers/userController");

router.post("/account/signin", userController.signin);
router.post("/user/userRegistration", userController.signup);
router.delete("/user/deleteUser", verifyToken, userController.deleteUser);
router.get(
  "/user/getCurrentUserById",
  verifyToken,
  userController.getCurrentUserById,
);
router.get(
  "/user/getsubscriptionstatus",
  verifyToken,
  userController.getSubscriptionStatus,
);

router.get(
  "/user/getsubscriptionstatus",
  verifyToken,
  userController.getSubscriptionStatus,
);
router.put("/user/changePassword", verifyToken, userController.changePassword);
router.post("/user/Edit/Profile", verifyToken, userController.editProfile);

// ─── Category ──────
const categoryController = require("../controllers/categoryController");

router.post(
  "/category/addUpdateCategory",
  verifyToken,
  categoryController.addUpdateCategory,
);
router.delete(
  "/category/deleteCategory",
  verifyToken,
  categoryController.deleteCategory,
);
router.get(
  "/category/getAllCategory",
  verifyToken,
  categoryController.getAllCategory,
);
router.get(
  "/category/getByIdCategory",
  verifyToken,
  categoryController.getByIdCategory,
);

// ─── Customer ───────
const customerController = require("../controllers/customerController");

router.post(
  "/customer/addCustomer",
  verifyToken,
  customerController.addCustomer,
);
router.put(
  "/customer/updateCustomer",
  verifyToken,
  customerController.updateCustomer,
);
router.delete(
  "/customer/deleteCustomer",
  verifyToken,
  customerController.deleteCustomer,
);
router.get(
  "/customer/getAllCustomer",
  verifyToken,
  customerController.getAllCustomer,
);
router.post(
  "/customer/getCustomerById",
  verifyToken,
  customerController.getCustomerById,
);

// ─── Staff ───────
const staffController = require("../controllers/staffController");

router.post("/staff/addStaff", verifyToken, staffController.addStaff);
router.put("/staff/updateStaff", verifyToken, staffController.updateStaff);
router.delete("/staff/deleteStaff", verifyToken, staffController.deleteStaff);
router.get("/staff/getAllStaff", verifyToken, staffController.getAllStaff);
router.get("/staff/getByIdStaff", verifyToken, staffController.getByIdStaff);

// ─── Service ─────
const serviceController = require("../controllers/serviceController");

router.post(
  "/service/insertService",
  verifyToken,
  serviceController.insertService,
);
router.put(
  "/service/updateService",
  verifyToken,
  serviceController.updateService,
);
router.delete(
  "/service/deleteService",
  verifyToken,
  serviceController.deleteService,
);
router.post(
  "/service/getAllService",
  verifyToken,
  serviceController.getAllService,
);
router.get(
  "/service/getServiceById",
  verifyToken,
  serviceController.getServiceById,
);

// ─── Setting ────────
const settingController = require("../controllers/settingController");

router.post(
  "/setting/addUpdateSetting",
  verifyToken,
  settingController.addUpdateSetting,
);
router.put(
  "/setting/updateSetting",
  verifyToken,
  settingController.updateSetting,
);
router.delete(
  "/setting/deleteSetting",
  verifyToken,
  settingController.deleteSetting,
);
router.get(
  "/setting/getAllSetting",
  verifyToken,
  settingController.getAllSetting,
);
router.get(
  "/setting/getUsersCurrencySetting",
  verifyToken,
  settingController.getUsersCurrencySetting,
);

// ─── Dropdown ──────
const dropdownController = require("../controllers/dropdownController");

router.get(
  "/dropdown/getAllDropdowns",
  verifyToken,
  dropdownController.getAllDropdowns,
);
router.get(
  "/dropdown/getCountryDropdown",
  dropdownController.getCountryDropdown,
); // no auth

// ─── Tax ─────────
const taxController = require("../controllers/taxController");

router.post("/tax/addTax", verifyToken, taxController.addTax);
router.put("/tax/updateTax", verifyToken, taxController.updateTax);
router.get(
  "/tax/getCurrentTaxRate",
  verifyToken,
  taxController.getCurrentTaxRate,
);
router.get("/tax/getTaxById", verifyToken, taxController.getTaxById);

// ─── Default Expenses ──────
const defaultExpensesController = require("../controllers/defaultExpensesController");

router.post(
  "/defaultExpense/addDefaultExpense",
  verifyToken,
  defaultExpensesController.addDefaultExpense,
);
router.put(
  "/defaultExpense/updateDefaultExpense",
  verifyToken,
  defaultExpensesController.updateDefaultExpense,
);
router.delete(
  "/defaultExpense/deleteDefaultExpense",
  verifyToken,
  defaultExpensesController.deleteDefaultExpense,
);
router.post(
  "/defaultExpense/getAllDefaultExpense",
  verifyToken,
  defaultExpensesController.getAllDefaultExpense,
);
router.get(
  "/defaultExpense/getDefaultExpenseById",
  verifyToken,
  defaultExpensesController.getDefaultExpenseById,
);

// ─── Expenses ──────
const expensesController = require("../controllers/expensesController");

router.post(
  "/expenses/addExpenses",
  verifyToken,
  expensesController.addExpenses,
);
router.post(
  "/expenses/updateExpenses",
  verifyToken,
  expensesController.updateExpenses,
);
router.delete(
  "/expenses/deleteExpenses",
  verifyToken,
  expensesController.deleteExpenses,
);
router.post(
  "/expenses/getAllExpenses",
  verifyToken,
  expensesController.getAllExpenses,
);
router.post(
  "/expenses/getAllExpensesIncome",
  verifyToken,
  expensesController.getAllExpensesIncome,
);
router.post(
  "/expenses/getProfitCalculate",
  verifyToken,
  expensesController.getProfitCalculate,
);
router.post(
  "/expenses/getExpensesById",
  verifyToken,
  expensesController.getExpensesById,
);

// ─── Billing ────────
const billingController = require("../controllers/billingController");

router.post("/billing/addBill", verifyToken, billingController.addBill);
router.put("/billing/updateBill", verifyToken, billingController.updateBill);
router.get(
  "/billing/getBillingById",
  verifyToken,
  billingController.getBillingById,
);
router.post(
  "/billing/getAllBilling",
  verifyToken,
  billingController.getAllBilling,
);
router.post(
  "/billing/getAllBillingHistory",
  verifyToken,
  billingController.getAllBillingHistory,
);
router.delete(
  "/billing/deleteBilling",
  verifyToken,
  billingController.deleteBilling,
);
router.get(
  "/billing/getallincome",
  verifyToken,
  billingController.getAllIncome,
);

router.get(
  "/billing/getallincome",
  verifyToken,
  billingController.getAllIncome,
);
router.post(
  "/billing/getBillingByCustomerId",
  verifyToken,
  billingController.getBillingByCustomerId,
);
router.get(
  "/billing/getAllPricingPlan",
  verifyToken,
  billingController.getAllPricingPlan,
);
router.post(
  "/billing/getAllBalanceAmount",
  verifyToken,
  billingController.getAllBalanceAmount,
);
router.put(
  "/billing/updatePendingBalance",
  verifyToken,
  billingController.updatePendingBalance,
);
router.post(
  "/billing/getBillingWorkReport",
  verifyToken,
  billingController.getBillingWorkReport,
);
router.post(
  "/billing/getAllMostEarning",
  verifyToken,
  billingController.getAllMostEarning,
);
router.post(
  "/billing/getBillingReportByStaffId",
  verifyToken,
  billingController.getBillingReportByStaffId,
);

module.exports = router;
