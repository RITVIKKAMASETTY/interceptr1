// src/components/HospitalPatientsView.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faUserPlus, 
  faSignOutAlt, 
  faHospital, 
  faUser, 
  faUserMd, 
  faCalendarAlt, 
  faInfoCircle, 
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import '../ui/pts.css';

const { VITE_BASE_URL } = import.meta.env;

const HospitalPatientsView = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(null); // 'unauthenticated', 'authenticated', 'hospital'
  const [currentHospital, setCurrentHospital] = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Get cookie function
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Format date function
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const authToken = getCookie('authToken');
      
      if (!authToken) {
        setAuthStatus('unauthenticated');
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated and has hospital role
        const response = await fetch(`${VITE_BASE_URL}/check-hospital-role/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200) {
          // User is a hospital
          const data = await response.json();
          setCurrentHospital({ name: data.hospital || "Your Hospital" });
          setAuthStatus('hospital');
          await loadPatients(authToken);
        } else if (response.status === 403) {
          // User is authenticated but not a hospital
          setAuthStatus('authenticated');
        } else if (response.status === 401) {
          // Token is invalid or expired
          document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          setAuthStatus('unauthenticated');
        } else {
          throw new Error('Server error');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setError('Something went wrong. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Load patients data
  const loadPatients = async (token) => {
    try {
      const response = await fetch(`${VITE_BASE_URL}/hospital-patients/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load patients');
      }
      
      const data = await response.json();
      const patients = data.patients || [];
      setAllPatients(patients);
      setFilteredPatients(patients);
    } catch (error) {
      console.error('Error loading patients:', error);
      setError('Error loading patients. Please try again later.');
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    
    let filtered = [...allPatients];
    
    if (filter === 'admitted') {
      filtered = allPatients.filter(p => !p.isDischarged);
    } else if (filter === 'discharged') {
      filtered = allPatients.filter(p => p.isDischarged);
    }
    
    // Apply search if there's text in the search box
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredPatients(filtered);
  };

  // Handle search
  const handleSearch = (event) => {
    const term = event.target.value.trim();
    setSearchTerm(term);
    
    // First apply the active filter
    let filtered = [...allPatients];
    
    if (activeFilter === 'admitted') {
      filtered = allPatients.filter(p => !p.isDischarged);
    } else if (activeFilter === 'discharged') {
      filtered = allPatients.filter(p => p.isDischarged);
    }
    
    // Then apply search
    if (term) {
      filtered = filtered.filter(p => 
        p.patient.name.toLowerCase().includes(term.toLowerCase()) ||
        p.doctor.name.toLowerCase().includes(term.toLowerCase()) ||
        p.reason.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    setFilteredPatients(filtered);
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    window.location.href = `${VITE_BASE_URL}/route/`;
  };

  // Handle become hospital
  const handleBecomeHospital = () => {
    const authToken = getCookie('authToken');
    localStorage.setItem('tempAuthToken', authToken);
    window.location.href = `${VITE_BASE_URL}/become-hospital/`;
  };

  // Handle register new patient
  const handleRegisterPatient = () => {
    const authToken = getCookie('authToken');
    localStorage.setItem('tempAuthToken', authToken);
    window.location.href = `${VITE_BASE_URL}/route/add-patient/`;
  };

  // Handle logout
  const handleLogout = () => {
    document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem('tempAuthToken');
    window.location.reload();
  };

  // Navigate to patient dashboard
  const navigateToPatientDashboard = (recordId) => {
    window.location.href = `${VITE_BASE_URL}/route/hospital-document/${recordId}`;
  };

  // Navigate to doctor dashboard
  const navigateToDoctorDashboard = (doctorId) => {
    window.location.href = `${VITE_BASE_URL}/route/doctor-dashboard/${doctorId}`;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="container">
        <div id="loading" className="loading-container">
          <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
          <p>Checking your credentials</p>
        </div>
      </div>
    );
  }

  // Render error message
  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <FontAwesomeIcon icon={faInfoCircle} className="error-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Render login prompt
  if (authStatus === 'unauthenticated') {
    return (
      <div className="container">
        <h1><FontAwesomeIcon icon={faHospital} /> Hospital Patients View</h1>
        <div className="auth-container">
          <h2>Please Login to Continue</h2>
          <p>You need to be logged in to access the hospital portal.</p>
          <button className="btn-primary" onClick={handleLoginRedirect}>
            <FontAwesomeIcon icon={faUser} /> Login to Continue
          </button>
        </div>
      </div>
    );
  }

  // Render become hospital prompt
  if (authStatus === 'authenticated') {
    return (
      <div className="container">
        <h1><FontAwesomeIcon icon={faHospital} /> Hospital Patients View</h1>
        <div className="auth-container">
          <h2>Hospital Registration Required</h2>
          <p>You need to be registered as a hospital to view patients.</p>
          <button className="btn-primary" onClick={handleBecomeHospital}>
            <FontAwesomeIcon icon={faHospital} /> Become a Hospital
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>
      </div>
    );
  }

  // Render patients view
  return (
    <div className="container">
      <h1><FontAwesomeIcon icon={faHospital} /> Hospital Patients View</h1>
      
      <div className="patients-view">
        <div className="hospital-info">
          <FontAwesomeIcon icon={faHospital} /> Hospital: {currentHospital.name}
        </div>
        
        <div className="search-container">
          <div className="search-box-wrapper">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input 
              type="text" 
              className="search-box" 
              placeholder="Search patients by name, doctor or reason..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="filter-container">
            <div 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </div>
            <div 
              className={`filter-btn ${activeFilter === 'admitted' ? 'active' : ''}`}
              onClick={() => handleFilterChange('admitted')}
            >
              Admitted
            </div>
            <div 
              className={`filter-btn ${activeFilter === 'discharged' ? 'active' : ''}`}
              onClick={() => handleFilterChange('discharged')}
            >
              Discharged
            </div>
          </div>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="no-patients">
            <FontAwesomeIcon icon={faInfoCircle} className="no-patients-icon" />
            <p>No patients found. Start by admitting a new patient.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="patients-table">
              <thead>
                <tr>
                  <th><FontAwesomeIcon icon={faUser} /> Patient Name</th>
                  <th><FontAwesomeIcon icon={faUserMd} /> Doctor</th>
                  <th><FontAwesomeIcon icon={faInfoCircle} /> Reason</th>
                  <th><FontAwesomeIcon icon={faCalendarAlt} /> Date Admitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <a 
                        href="#" 
                        className="patient-link"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToPatientDashboard(record.id);
                        }}
                      >
                        <FontAwesomeIcon icon={faUser} /> {record.patient.name}
                      </a>
                    </td>
                    <td>
                      <a 
                        href="#" 
                        className="patient-link"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToDoctorDashboard(record.doctor.id);
                        }}
                      >
                        <FontAwesomeIcon icon={faUserMd} /> {record.doctor.name}
                      </a>
                    </td>
                    <td>{record.reason}</td>
                    <td>
                      <FontAwesomeIcon icon={faCalendarAlt} /> {formatDate(record.date || record.createdAt)}
                    </td>
                    <td>
                      <span className={`status-badge ${record.isDischarged ? 'discharged' : 'admitted'}`}>
                        {record.isDischarged ? 'Discharged' : 'Admitted'}
                      </span>
                    </td>
                    <td>
                      <a 
                        href="#" 
                        className="view-details-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToPatientDashboard(record.id);
                        }}
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="action-buttons">
          <button className="btn-primary" onClick={handleRegisterPatient}>
            <FontAwesomeIcon icon={faUserPlus} /> Register New Patient
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default HospitalPatientsView;