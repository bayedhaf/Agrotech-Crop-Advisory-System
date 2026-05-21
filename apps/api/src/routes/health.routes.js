// routes/health.routes.js
const { Router } = require("express");

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Basic server health check
 * @access  Public
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
