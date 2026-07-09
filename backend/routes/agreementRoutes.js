const express = require('express');
const router = express.Router();
const { protect, authorise } = require('../middleware/authMiddleware');
const {
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
} = require('../controllers/agreementController');

const guard = [protect, authorise('Admin')];

router.route('/')
  .get(...guard, getAllAgreements)
  .post(...guard, createAgreement);

router.route('/:id')
  .get(...guard, getAgreementById)
  .put(...guard, updateAgreement)
  .delete(...guard, deleteAgreement);

module.exports = router;
