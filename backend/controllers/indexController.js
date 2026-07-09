/**
 * @desc    Health check – confirms the API is reachable
 * @route   GET /
 * @access  Public
 */
const getStatus = (req, res) => {
  res.send('StaySphere Backend Running');
};

module.exports = { getStatus };
