const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseTitle: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Electricity', 'Water', 'Internet', 'Salary', 'Maintenance', 'Groceries', 'Repairs', 'Other'],
        message: '{VALUE} is not a valid category',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['Cash', 'UPI', 'Bank Transfer', 'Card'],
        message: '{VALUE} is not a valid payment method',
      },
    },
    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
