const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const grantRoutes = require('./grantRoutes');
const applicationRoutes = require('./applicationRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/grants', grantRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;
