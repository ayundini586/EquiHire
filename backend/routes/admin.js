const express = require('express')
const router = express.Router()
const { sql, poolPromise } = require('../config/db')
const { authenticateToken } = require('../middleware/auth')

// Get all pending CVs
router.get('/cvs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .query(`
        SELECT cv.*, 'Candidate #EM-' + RIGHT('000' + CAST(cv.user_id AS NVARCHAR), 3) AS candidate_code
        FROM CVs cv
        WHERE cv.status = 'pending'
        ORDER BY cv.uploaded_at DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Approve or reject CV
router.put('/cvs/:cv_id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  const { status } = req.body // 'approved' or 'rejected'
  try {
    const pool = await poolPromise
    await pool.request()
      .input('cv_id', sql.Int, req.params.cv_id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE CVs SET status=@status WHERE cv_id=@cv_id')
    res.json({ message: `CV ${status}` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get all pending jobs
router.get('/jobs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .query(`
        SELECT j.*, c.first_name + ' ' + c.last_name AS company_name, c.city AS company_city
        FROM Jobs j
        JOIN Companies c ON j.company_id = c.company_id
        WHERE j.status = 'pending'
        ORDER BY j.created_at DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Approve or reject job
router.put('/jobs/:job_id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  const { status } = req.body // 'approved' or 'rejected'
  try {
    const pool = await poolPromise
    await pool.request()
      .input('job_id', sql.Int, req.params.job_id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE Jobs SET status=@status WHERE job_id=@job_id')
    res.json({ message: `Job ${status}` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get all users
router.get('/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .query('SELECT user_id, first_name, last_name, email, city, created_at FROM Users ORDER BY created_at DESC')
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get all companies
router.get('/companies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .query('SELECT company_id, first_name, last_name, email, city, is_verified, created_at FROM Companies ORDER BY created_at DESC')
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Verify company
router.put('/companies/:company_id/verify', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    await pool.request()
      .input('company_id', sql.Int, req.params.company_id)
      .query('UPDATE Companies SET is_verified=1 WHERE company_id=@company_id')
    res.json({ message: 'Company verified' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router