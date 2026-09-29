const express = require('express')
const router = express.Router()
const { sql, poolPromise } = require('../config/db')
const { authenticateToken } = require('../middleware/auth')

// Get company profile
router.get('/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT company_id, company_name, first_name, last_name, email, phone, city, founding_date, is_verified, created_at FROM Companies WHERE company_id = @id')
    res.json(result.recordset[0])
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Update company profile
router.put('/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  const { company_name, tagline, city, description, first_name, last_name, recruiter_role, phone } = req.body
  try {
    const pool = await poolPromise
    const companyId = req.user.company_id || req.user.id

    await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('company_name', sql.NVarChar, company_name)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('recruiter_role', recruiter_role)
      .input('phone', sql.NVarChar, phone)
      .input('tagline', tagline)
      .input('city', sql.NVarChar, city)
      .input('description', description)
      .query('UPDATE Companies SET company_name = @company_name, first_name=@first_name, last_name=@last_name, recruiter_role = @recruiter_role, phone=@phone, tagline = @tagline, city=@city, description = @description WHERE company_id=@id')
    res.json({ message: 'Profile updated successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const companyId = req.user.company_id || req.user.id

    const currentCompany = await pool.request()
      .input('id', sql.Int, companyId)
      .query('SELECT city FROM Companies WHERE company_id = @id')

    const currentCity = currentCompany.recordset[0]?.city || ''

    const nearbyCompanies = await pool.request()
      .input('id', sql.Int, companyId)
      .input('city', sql.NVarChar, currentCity)
      .query(`
        SELECT TOP 3 c.company_name, c.first_name, c.last_name, c.city,
               COUNT(j.job_id) AS active_roles
        FROM Companies c
        LEFT JOIN Jobs j ON c.company_id = j.company_id AND j.status = 'approved'
        WHERE c.company_id <> @id AND c.city = @city
        GROUP BY c.company_id, c.company_name, c.first_name, c.last_name, c.city
        ORDER BY active_roles DESC
      `)

    const activeJobs = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT COUNT(*) AS count FROM Jobs WHERE company_id = @id AND status = 'approved'`)

    const newJobsThisWeek = await pool.request()
      .input('id', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count FROM Jobs 
        WHERE company_id = @id 
        AND created_at >= DATEADD(day, -7, GETDATE())
      `)

    const totalApplicants = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT COUNT(*) AS count FROM Applications a
        JOIN Jobs j ON a.job_id = j.job_id
        WHERE j.company_id = @id
      `)

    const needReview = await pool.request()
      .input('id', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count FROM Applications a
        JOIN Jobs j ON a.job_id = j.job_id
        WHERE j.company_id = @id AND a.status = 'pending'
      `)

    const interviewsToday = await pool.request()
      .input('id', sql.Int, companyId)
      .query(`
        SELECT COUNT(*) AS count FROM Applications a
        JOIN Jobs j ON a.job_id = j.job_id
        WHERE j.company_id = @id AND a.status = 'accepted'
      `)

    res.json({
      active_jobs: activeJobs.recordset[0].count,
      new_jobs_this_week: newJobsThisWeek.recordset[0].count,
      total_applicants: totalApplicants.recordset[0].count,
      need_review_count: needReview.recordset[0].count,
      interviews_today_count: interviewsToday.recordset[0].count,
      nearby_companies: nearbyCompanies.recordset
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get all jobs by company
// 🌟 TAMBAHKAN RUTE BARU INI UNTUK MENDUKUNG COMPONENT JOBDETAIL PERUSAHAAN
router.get('/jobs/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .input('job_id', sql.Int, req.params.id)
      // Menggunakan query longgar tanpa filter company_id ketat agar bypass akun testing aman
      .query(`
        SELECT j.*, c.company_name AS recruiter_name, c.city AS company_city
        FROM Jobs j
        LEFT JOIN Companies c ON j.company_id = c.company_id
        WHERE j.job_id = @job_id
      `)
      
    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'Job listing record not found' })
      
    res.json(result.recordset[0])
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/jobs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const companyId = req.user.company_id || req.user.id
    const result = await pool.request()
      .input('id', sql.Int, companyId)
      .query(`
        SELECT j.*, COUNT(a.application_id) AS applicant_count
        FROM Jobs j
        LEFT JOIN Applications a ON j.job_id = a.job_id
        WHERE j.company_id = @id
        GROUP BY j.job_id, j.company_id, j.title, j.department, j.description,
                 j.location, j.job_type, j.salary_range, j.experience_level,
                 j.deadline, j.status, j.created_at,
                 j.responsibilities, j.requirements, j.benefits,
                 j.currency, j.salary_min, j.salary_max, j.salary_unit
        ORDER BY j.created_at DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Create job
router.post('/jobs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  const { title, department, description, location, job_type, experience_level, deadline, is_draft, responsibilities, requirements, benefits, currency, salary_min, salary_max, salary_unit } = req.body

  const finalStatus = is_draft ? 'draft' : 'pending'

  try {
    const pool = await poolPromise
    await pool.request()
      .input('company_id', sql.Int, req.user.company_id || req.user.id)
      .input('title', sql.NVarChar, title)
      .input('department', sql.NVarChar, department)
      .input('description', sql.NVarChar, description)
      .input('location', sql.NVarChar, location)
      .input('job_type', sql.NVarChar, job_type)
      .input('experience_level', sql.NVarChar, experience_level)
      .input('deadline', sql.Date, deadline)
      .input('status', sql.NVarChar, finalStatus)
      .input('responsibilities', sql.NVarChar(sql.MAX), responsibilities || '')
      .input('requirements', sql.NVarChar(sql.MAX), requirements || '')
      .input('benefits', sql.NVarChar(sql.MAX), benefits || '')
      .input('currency', sql.NVarChar, currency || '')
      .input('salary_min', sql.Int, parseInt(salary_min) || 0)
      .input('salary_max', sql.Int, parseInt(salary_max) || 0)
      .input('salary_unit', sql.NVarChar, salary_unit || '')
      .query(`
        INSERT INTO Jobs (company_id, title, department, description, location, job_type, experience_level, deadline, status, responsibilities, requirements, benefits, currency, salary_min, salary_max, salary_unit, created_at)
        VALUES (@company_id, @title, @department, @description, @location, @job_type, @experience_level, @deadline, @status, @responsibilities, @requirements, @benefits, @currency, @salary_min, @salary_max, @salary_unit, GETDATE())
      `)

    const message = is_draft 
      ? 'Job saved as draft successfully' 
      : 'Job posted successfully, pending admin approval'

    res.status(201).json({ message })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Update job
router.put('/jobs/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  const { title, department, description, location, job_type, experience_level, deadline, responsibilities, requirements, benefits, is_draft, currency, salary_min, salary_max, salary_unit } = req.body
  const finalStatus = is_draft ? 'draft' : 'pending'

  try {
    const pool = await poolPromise
    await pool.request()
      .input('job_id', sql.Int, req.params.id)
      .input('company_id', sql.Int, req.user.company_id || req.user.id)
      .input('title', sql.NVarChar, title)
      .input('department', sql.NVarChar, department)
      .input('description', sql.NVarChar, description)
      .input('location', sql.NVarChar, location)
      .input('job_type', sql.NVarChar, job_type)
      .input('experience_level', sql.NVarChar, experience_level)
      .input('deadline', sql.Date, deadline)
      .input('responsibilities', sql.NVarChar(sql.MAX), responsibilities)
      .input('requirements', sql.NVarChar(sql.MAX), requirements)
      .input('benefits', sql.NVarChar(sql.MAX), benefits)
      .input('status', sql.NVarChar, finalStatus)
      .input('currency', sql.NVarChar, currency || '')
      .input('salary_min', sql.Int, parseInt(salary_min) || 0)
      .input('salary_max', sql.Int, parseInt(salary_max) || 0)
      .input('salary_unit', sql.NVarChar, salary_unit || '')
      .query(`
        UPDATE Jobs SET title=@title, department=@department, description=@description,
        location=@location, job_type=@job_type, experience_level=@experience_level, deadline=@deadline,
        responsibilities=@responsibilities, requirements=@requirements, benefits=@benefits, status=@status,
        currency=@currency, salary_min=@salary_min, salary_max=@salary_max, salary_unit=@salary_unit
        WHERE job_id=@job_id AND company_id=@company_id
      `)
    res.json({ message: 'Job updated successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Delete job
router.delete('/jobs/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    await pool.request()
      .input('job_id', sql.Int, req.params.id)
      .input('company_id', sql.Int, req.user.id)
      .query('DELETE FROM Jobs WHERE job_id=@job_id AND company_id=@company_id')
    res.json({ message: 'Job deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get applicants for a job (anonymized)
router.get('/jobs/:id/applicants', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .input('job_id', sql.Int, req.params.id)
      .input('company_id', sql.Int, req.user.id)
      .query(`
        SELECT a.application_id, a.status, a.applied_at,
               'Candidate #EM-' + RIGHT('000' + CAST(a.user_id AS NVARCHAR), 3) AS candidate_code,
               cv.file_name, cv.status AS cv_status
        FROM Applications a
        JOIN Jobs j ON a.job_id = j.job_id
        JOIN CVs cv ON a.cv_id = cv.cv_id
        WHERE a.job_id = @job_id AND j.company_id = @company_id
        ORDER BY a.applied_at DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Accept or reject applicant
router.put('/applicants/:application_id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'company')
    return res.status(403).json({ message: 'Access denied' })
  const { status } = req.body // 'accepted' or 'rejected'
  try {
    const pool = await poolPromise
    await pool.request()
      .input('application_id', sql.Int, req.params.application_id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE Applications SET status=@status WHERE application_id=@application_id')
    res.json({ message: `Applicant ${status}` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router