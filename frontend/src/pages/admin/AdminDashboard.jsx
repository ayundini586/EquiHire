import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { User } from 'lucide-react'
import API from '../../services/api'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('cv')
  const [selectedJob, setSelectedJob] = useState(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [pendingCVs, setPendingCVs] = useState([])
  const [pendingJobs, setPendingJobs] = useState([])

  const fetchAdminQueues = async () => {
    try {
      setLoading(true)
      const [jobsRes, cvsRes] = await Promise.all([
        API.get('/admin/jobs'),
        API.get('/admin/cvs')
      ])
      setPendingJobs(jobsRes.data || [])
      setPendingCVs(cvsRes.data || [])
    } catch (err) {
      console.error('Error loading admin compliance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminQueues()
  }, [])

  const handleCVDecision = async (cvId, decision) => {
    const targetStatus = decision === 'approved' ? 'approved' : 'rejected'
    const confirmMsg = decision === 'approved' 
      ? 'Verify and pass this candidate CV document?' 
      : 'Flag and reject this CV document asset?'

    if (!window.confirm(confirmMsg)) return

    try {
      await API.put(`/admin/cvs/${cvId}`, { status: targetStatus })
      
      setPendingCVs((prev) => prev.filter((c) => c.cv_id !== cvId))
      alert(`CV asset has been marked as ${targetStatus}.`)
    } catch (err) {
      console.error('Error updating CV status:', err)
      alert('Failed to update CV verification status.')
    }
  }

  const handleJobDecision = async (jobId, decision) => {
    const targetStatus = decision === 'approved' ? 'approved' : 'closed'
    const confirmMsg = decision === 'approved' 
      ? 'Approve and publish this corporate job listing to the platform?' 
      : 'Reject and close this pending job proposal?'

    if (!window.confirm(confirmMsg)) return

    try {
      await API.put(`/admin/jobs/${jobId}`, { status: targetStatus })
      
      setPendingJobs((prev) => prev.filter((j) => (j.job_id || j.id) !== jobId))
      setSelectedJob(null)
      alert(`Job listing has been officially ${targetStatus}.`)
    } catch (err) {
      console.error('Error updating job deployment status:', err)
      alert('Failed to update corporate listing status.')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Loading administrative verification dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div style={styles.modalOverlay} onClick={() => setSelectedJob(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
 
            {/* Modal header */}
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalMeta}>
                  <span style={styles.modalJobId}>#{selectedJob.job_id || selectedJob.id}</span>
                  <span style={styles.modalType}>{selectedJob.job_type || selectedJob.type}</span>
                </div>
                <h2 style={styles.modalTitle}>{selectedJob.title}</h2>
                <p style={styles.modalCompany}>Company Identity ID: #{selectedJob.company_id}</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedJob(null)}>✕</button>
            </div>
 
            {/* Modal meta row */}
            <div style={styles.modalMetaRow}>
              <span>📍 {selectedJob.location}</span>
              <span>💰 {selectedJob.salary_range || selectedJob.salary}</span>
              <span>🏢 Department: {selectedJob.department}</span>
              <span>📅 Experience: {selectedJob.experience_level || selectedJob.experience}</span>
              <span>⏰ Deadline: {selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : '-'}</span>
            </div>
 
            <div style={styles.modalDivider} />
 
            {/* Description */}
            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>About the Role</h3>
              <p style={{ ...styles.modalText, whiteSpace: 'pre-line' }}>{selectedJob.description}</p>
            </div>
 
            {/* Responsibilities */}
            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Primary Responsibilities</h3>
              <ul style={styles.modalList}>
                {selectedJob.responsibilities.split('\n').map((r, i) => r.trim() && (
                    <li key={i} style={styles.modalListItem}>
                      <span style={styles.modalCheck}>✔</span> {r}
                    </li>
                  ))}
              </ul>
            </div>
 
            {/* Requirements */}
            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Requirements</h3>
              <div style={styles.skillTags}>
                {selectedJob.requirements.split(',').map((r, i) => (
                    <span key={i} style={styles.skillTag}>{r.trim()}</span>
                  ))}
              </div>
            </div>
 
            <div style={styles.modalDivider} />
 
            {/* Modal actions */}
            <div style={styles.modalActions}>
              <button
                style={styles.rejectBtn}
                onClick={() => handleJob(selectedJob.job_id || selectedJob.id, 'rejected')}
              >
                Reject Posting
              </button>
              <button
                style={styles.approveBtn}
                onClick={() => handleJobDecision(selectedJob.job_id || selectedJob.id, 'approved')}
              >
                Approve Job →
              </button>
            </div>
 
          </div>
        </div>
      )} 

      {/* Admin Topbar — replaces Navbar */}
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.topbarLeft}>
            <div style={styles.iconCircle}> <User size={16} color="#1a1e6c" /> </div>
            <span style={styles.topbarBrand}>EquiHire</span>
            <span style={styles.topbarDivider} />
            <span style={styles.topbarRole}>Admin Panel</span>
          </div>
          <div style={styles.topbarRight}>
            <div style={styles.topbarUser}>
              <span style={styles.userDot} />
              {localStorage.getItem('admin_email') || user?.email || 'DEBUG: Data Login Belum Masuk Ke Browser'}
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={styles.container}>

        {/* Page header */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Admin Dashboard</h1>
            <p style={styles.pageSubtitle}>Review and validate pending CVs and job postings.</p>
          </div>
          <div style={styles.statPills}>
            <div style={styles.statPill}>
              <span style={styles.statPillIcon}>📄</span>
              <div>
                <p style={styles.statPillLabel}>CV QUEUE</p>
                <p style={styles.statPillValue}>{pendingCVs.length}</p>
              </div>
            </div>
            <div style={styles.statPill}>
              <span style={styles.statPillIcon}>💼</span>
              <div>
                <p style={styles.statPillLabel}>JOB QUEUE</p>
                <p style={{ ...styles.statPillValue, color: '#ca8a04' }}>{pendingJobs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button
            style={{
              ...styles.tab,
              borderBottom: activeTab === 'cv' ? '2px solid #0f1240' : '2px solid transparent',
              color: activeTab === 'cv' ? '#0f1240' : '#6b7280',
              fontWeight: activeTab === 'cv' ? '700' : '500',
            }}
            onClick={() => setActiveTab('cv')}
          >
            📄 CV Validation
            {pendingCVs.length > 0 && (
              <span style={styles.tabBadge}>{pendingCVs.length}</span>
            )}
          </button>
          <button
            style={{
              ...styles.tab,
              borderBottom: activeTab === 'job' ? '2px solid #0f1240' : '2px solid transparent',
              color: activeTab === 'job' ? '#0f1240' : '#6b7280',
              fontWeight: activeTab === 'job' ? '700' : '500',
            }}
            onClick={() => setActiveTab('job')}
          >
            💼 Job Posting Validation
            {pendingJobs.length > 0 && (
              <span style={{ ...styles.tabBadge, background: '#fef9c3', color: '#ca8a04' }}>
                {pendingJobs.length}
              </span>
            )}
          </button>
        </div>

        {/* CV Tab */}
        {activeTab === 'cv' && (
          <div style={styles.cardList}>
            {pendingCVs.length > 0 ? (
              pendingCVs.map((cv) => (
                <div key={cv.application_id} style={styles.itemCard}>
                  <div style={styles.cardLeft}>
                    <div style={styles.avatar}>👤</div>
                    <div>
                      <div style={styles.cardTitleRow}>
                        <p style={styles.candidateName}>{cv.candidate_code || `Candidate #EM-${cv.application_id}`}</p>
                        <span style={styles.candidateId}>#{cv.application_id}</span>
                      </div>
                      <div style={styles.cardMeta}>
                        <span>💼 Target Job ID: #{cv.job_id}</span>
                        <span>🕐 Applied At: {cv.applied_at ? new Date(cv.applied_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                      <div style={styles.fileRow}>
                        <span style={styles.fileIcon}>📎</span>
                        <span style={styles.fileName}>{cv.file_name}</span>
                        <button style={styles.viewBtn} onClick={() => alert(`Opening verification document file: ${cv.file_name}`)}>View CV</button>
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.rejectBtn}
                      onClick={() => handleCVDecision(cv.cv_id, 'rejected')}
                    >
                      Reject
                    </button>
                    <button
                      style={styles.approveBtn}
                      onClick={() => handleCVDecision(cv.cv_id, 'approved')}
                    >
                      Approve CV
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>✅</p>
                <p style={styles.emptyText}>All CVs have been reviewed!</p>
              </div>
            )}
          </div>
        )}

        {/* Job Tab */}
        {activeTab === 'job' && (
          <div style={styles.cardList}>
            {pendingJobs.length > 0 ? (
              pendingJobs.map((job) => (
                <div key={job.job_id || job.id} style={styles.itemCard}>
                  <div style={styles.cardLeft}>
                    <div style={styles.avatar}>🏢</div>
                    <div>
                      <div style={styles.cardTitleRow}>
                        <p
                          style={{ ...styles.candidateName, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#c7d2fe' }}
                          onClick={() => setSelectedJob(job)}
                        >{job.title}</p>
                        <span style={styles.candidateId}>#{job.job_id || job.id}</span>
                      </div>
                      <p style={styles.companyName}>Company Corporate Node ID: #{job.company_id}</p>
                      <div style={styles.cardMeta}>
                        <span>📍 {job.location || 'Remote'}</span>
                        <span>💰 {job.salary_range || 'Confidential'}</span>
                        <span>🏢 Department: {job.department || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.rejectBtn}
                      onClick={() => handleJobDecision(job.job_id || job.id, 'rejected')}
                    >
                      Reject
                    </button>
                    <button
                      style={styles.approveBtn}
                      onClick={() => handleJobDecision(job.job_id || job.id, 'approved')}
                    >
                      Approve Job
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>✅</p>
                <p style={styles.emptyText}>All job postings have been reviewed!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 18, 64, 0.45)',
    backdropFilter: 'blur(3px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modalBox: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  modalMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  modalJobId: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '600',
  },
  modalType: {
    fontSize: '11px',
    fontWeight: '700',
    background: '#e0e7ff',
    color: '#0f1240',
    borderRadius: '99px',
    padding: '2px 10px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f1240',
    marginBottom: '4px',
  },
  modalCompany: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1e6c',
  },
  closeBtn: {
    background: '#f4f5f9',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#6b7280',
    flexShrink: 0,
  },
  modalMetaRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '20px',
  },
  modalDivider: {
    height: '1px',
    background: '#e2e5f0',
    margin: '20px 0',
  },
  modalSection: {
    marginBottom: '20px',
  },
  modalSectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  modalText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.7',
  },
  modalList: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalListItem: {
    fontSize: '14px',
    color: '#4b5563',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  modalCheck: {
    color: '#1a1e6c',
    flexShrink: 0,
    marginTop: '1px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    alignItems: 'center',
  },

  // Admin topbar
  topbar: {
    background: '#f4faff',
    borderBottom: '3px solid #e2e5f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  topbarInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1.5px solid #1a1e6c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarBrand: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1e6c',
  },
  topbarDivider: {
    width: '1px',
    height: '18px',
    background: '#1a1e6c',
    display: 'inline-block',
  },
  topbarRole: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1a1e6c',
    letterSpacing: '0.05em',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  topbarUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '13px',
    color: '#1a1e6c',
  },
  userDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 5px #22c55e',
    display: 'inline-block',
  },
  logoutBtn: {
    padding: '6px 14px',
    border: '1px solid #1a1e6c',
    borderRadius: '8px',
    background: 'none',
    color: '#1a1e6c',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // Page
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1a1e6c',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  statPills: {
    display: 'flex',
    gap: '12px',
  },
  statPill: {
    background: '#ffffff',
    border: '1px solid #e2e5f0',
    borderRadius: '12px',
    padding: '12px 20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  statPillIcon: {
    fontSize: '22px',
  },
  statPillLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: '0.08em',
  },
  statPillValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1a1e6c',
    lineHeight: 1.2,
  },
  tabRow: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid #e2e5f0',
    marginBottom: '24px',
    background: '#ffffff',
    borderRadius: '12px 12px 0 0',
    padding: '0 8px',
  },
  tab: {
    padding: '16px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'color 0.15s',
  },
  tabBadge: {
    padding: '2px 8px',
    background: '#e0e7ff',
    color: '#1a1e6c',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: '700',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemCard: {
    background: '#ffffff',
    border: '1px solid #e2e5f0',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    transition: 'border-color 0.2s',
  },
  cardLeft: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  avatar: {
    width: '44px',
    height: '44px',
    background: '#f0f2f8',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  },
  candidateName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1a1e6c',
  },
  candidateId: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  companyName: {
    fontSize: '13px',
    color: '#1a1e6c',
    fontWeight: '600',
    marginBottom: '4px',
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  skillTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  skillTag: {
    padding: '3px 10px',
    background: '#f0f2f8',
    color: '#374151',
    borderRadius: '99px',
    fontSize: '12px',
    fontWeight: '500',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  fileIcon: {
    fontSize: '13px',
  },
  fileName: {
    fontSize: '12px',
    color: '#6b7280',
  },
  viewBtn: {
    padding: '3px 10px',
    border: '1px solid #e2e5f0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'none',
    color: '#374151',
    marginLeft: '4px',
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexShrink: 0,
  },
  rejectBtn: {
    padding: '8px 16px',
    background: 'none',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
  },
  approveBtn: {
    padding: '8px 18px',
    background: '#1a1e6c',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e5f0',
  },
  emptyIcon: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#6b7280',
  },
}