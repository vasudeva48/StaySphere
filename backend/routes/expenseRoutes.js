const express = require('express');
const router = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseMonths,
} = require('../controllers/expenseController');

const guard = [protect, authorise('Admin')];

// Summary & unique months list endpoints (defined before /:id parameter matching)
router.get('/summary', ...guard, getExpenseSummary);
router.get('/months', ...guard, getExpenseMonths);

router.route('/')
  .get(...guard, getAllExpenses)
  .post(...guard, createExpense);

router.route('/:id')
  .get(...guard, getExpenseById)
  .put(...guard, updateExpense)
  .delete(...guard, deleteExpense);

module.exports = router;
