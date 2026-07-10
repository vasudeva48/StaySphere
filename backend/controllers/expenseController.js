const Expense = require('../models/Expense');

/**
 * @desc    Create a new expense record
 * @route   POST /api/expenses
 * @access  Private – Admin only
 */
const createExpense = async (req, res) => {
  const { expenseTitle, category, amount, paymentMethod, expenseDate, description, receiptNumber } = req.body;

  if (!expenseTitle || !category || amount === undefined || !paymentMethod || !expenseDate) {
    return res.status(400).json({
      success: false,
      message: 'expenseTitle, category, amount, paymentMethod, and expenseDate are required',
    });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than zero',
    });
  }

  try {
    const expense = await Expense.create({
      expenseTitle,
      category,
      amount: Number(amount),
      paymentMethod,
      expenseDate: new Date(expenseDate),
      description,
      receiptNumber,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense,
    });
  } catch (error) {
    console.error('Error in createExpense:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Get all expense records with optional filters (category, search, month, pagination)
 * @route   GET /api/expenses?category=&search=&month=&page=&limit=
 * @access  Private – Admin only
 */
const getAllExpenses = async (req, res) => {
  const { category, search, month, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (category && category !== 'All') {
    filter.category = category;
  }

  if (month) {
    // Expect month filter in "YYYY-MM" format
    const [year, monthNum] = month.split('-');
    if (year && monthNum) {
      const start = new Date(Number(year), Number(monthNum) - 1, 1);
      const end = new Date(Number(year), Number(monthNum), 0, 23, 59, 59, 999);
      filter.expenseDate = { $gte: start, $lte: end };
    }
  }

  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [
      { expenseTitle: rx },
      { category: rx },
      { paymentMethod: rx },
      { description: rx },
      { receiptNumber: rx }
    ];
  }

  try {
    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Expense.find(filter)
        .populate('createdBy', 'fullName email')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Expense.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      data: records,
    });
  } catch (error) {
    console.error('Error in getAllExpenses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get a single expense record
 * @route   GET /api/expenses/:id
 * @access  Private – Admin only
 */
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error in getExpenseById:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update an expense record
 * @route   PUT /api/expenses/:id
 * @access  Private – Admin only
 */
const updateExpense = async (req, res) => {
  const { expenseTitle, category, amount, paymentMethod, expenseDate, description, receiptNumber } = req.body;

  if (amount !== undefined && Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than zero',
    });
  }

  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (expenseTitle) expense.expenseTitle = expenseTitle;
    if (category) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (description !== undefined) expense.description = description;
    if (receiptNumber !== undefined) expense.receiptNumber = receiptNumber;

    await expense.save();

    res.status(200).json({
      success: true,
      message: 'Expense record updated successfully',
      data: expense,
    });
  } catch (error) {
    console.error('Error in updateExpense:', error);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete an expense record
 * @route   DELETE /api/expenses/:id
 * @access  Private – Admin only
 */
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    res.status(200).json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get expense summary (total aggregate sum, monthly aggregate sum)
 * @route   GET /api/expenses/summary
 * @access  Private – Admin only
 */
const getExpenseSummary = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [totalAgg, monthlyAgg, count] = await Promise.all([
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalExpenses: totalAgg[0]?.total || 0,
        monthlyExpenses: monthlyAgg[0]?.total || 0,
        transactionCount: count
      }
    });
  } catch (error) {
    console.error('Error in getExpenseSummary:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get list of unique months of logged expenses
 * @route   GET /api/expenses/months
 * @access  Private – Admin only
 */
const getExpenseMonths = async (req, res) => {
  try {
    const months = await Expense.aggregate([
      {
        $project: {
          yearMonth: {
            $dateToString: { format: '%Y-%m', date: '$expenseDate' }
          }
        }
      },
      {
        $group: {
          _id: '$yearMonth'
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);
    const data = months.map(m => m._id).filter(Boolean);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getExpenseMonths:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseMonths,
};
