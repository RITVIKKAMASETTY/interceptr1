import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSearch, faUserMd, faUser, faNotesMedical, faSignOutAlt, faHospital, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '../ui/ptReg.css';

const HospitalPatientRegistration = () => {
  // State management
  const [view, setView] = useState('loading'); // 'loading', 'login', 'role', 'form'
  const [authToken, setAuthToken] = useState(null);
  const [currentHospital, setCurrentHospital] = useState(null);
  const [formMessage, setFormMessage] = useState({ type: '', message: '' });
  
  // Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientResults, setShowPatientResults] = useState(false);
  
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorResults, setDoctorResults] = useState([]);
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Error states
  const [errors, setErrors] = useState({
    patient: '',
    doctor: '',
    reason: '',
    general: ''
  });
  
  // Refs for click outside detection
  const patientResultsRef = useRef(null);
  const patientSearchRef = useRef(null);
  const doctorResultsRef = useRef(null);
  const doctorSearchRef = useRef(null);
  const submitBtnRef = useRef(null);
  
  // Enhanced cookie functions
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const setCookie = (name, value, days = 7, path = '/') => {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=${path}; SameSite=Strict; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
  };

  const deleteCookie = (name, path = '/') => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Strict`;
  };

  // Initialize page on mount
  useEffect(() => {
    const token = getCookie('authToken');
    setAuthToken(token);
    
    const initTimeout = setTimeout(() => {
      if (view === 'loading') {
        setView('login');
        setErrors({...errors, general: 'Connection timeout. Please refresh the page or try again later.'});
      }
    }, 15000);
    
    if (!token) {
      setView('login');
      return () => clearTimeout(initTimeout);
    }
    
    const checkAuth = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/check-hospital-role/`, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        
        if (response.status === 200) {
          // User is a hospital
          const data = await response.json();
          setCurrentHospital({ name: data.hospital });
          setCookie('authToken', token);
          setView('form');
        } else if (response.status === 403) {
          // User is authenticated but not a hospital
          setView('role');
        } else if (response.status === 401) {
          // Token is invalid or expired
          deleteCookie('authToken');
          setAuthToken(null);
          setView('login');
        } else {
          throw new Error('Server error');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setErrors({...errors, general: 'Something went wrong. Please try again later.'});
        setView('login');
      }
    };
    
    checkAuth();
    return () => clearTimeout(initTimeout);
  }, []);
  
  // Click outside event handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (patientResultsRef.current && patientSearchRef.current && 
          !patientResultsRef.current.contains(event.target) && 
          !patientSearchRef.current.contains(event.target)) {
        setShowPatientResults(false);
      }
      
      if (doctorResultsRef.current && doctorSearchRef.current && 
          !doctorResultsRef.current.contains(event.target) && 
          !doctorSearchRef.current.contains(event.target)) {
        setShowDoctorResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Debounce function for search
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };
  
  const debouncedPatientSearch = useDebounce(patientSearch, 300);
  const debouncedDoctorSearch = useDebounce(doctorSearch, 300);
  
  // Search effects
  useEffect(() => {
    if (debouncedPatientSearch.length < 2) {
      setPatientResults([]);
      setShowPatientResults(false);
      return;
    }
    
    const searchPatients = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/patients/search/?query=${encodeURIComponent(debouncedPatientSearch)}`, {
          headers: {
            'Authorization': `Token ${authToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const patients = await response.json();
        setPatientResults(patients);
        setShowPatientResults(true);
      } catch (error) {
        console.error('Patient search error:', error);
        setPatientResults([{ error: true, message: 'Error searching patients' }]);
        setShowPatientResults(true);
      }
    };
    
    if (authToken && view === 'form') {
      searchPatients();
    }
  }, [debouncedPatientSearch, authToken, view]);
  
  useEffect(() => {
    if (debouncedDoctorSearch.length < 2) {
      setDoctorResults([]);
      setShowDoctorResults(false);
      return;
    }
    
    const searchDoctors = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/doctors/search/?query=${encodeURIComponent(debouncedDoctorSearch)}`, {
          headers: {
            'Authorization': `Token ${authToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const doctors = await response.json();
        setDoctorResults(doctors);
        setShowDoctorResults(true);
      } catch (error) {
        console.error('Doctor search error:', error);
        setDoctorResults([{ error: true, message: 'Error searching doctors' }]);
        setShowDoctorResults(true);
      }
    };
    
    if (authToken && view === 'form') {
      searchDoctors();
    }
  }, [debouncedDoctorSearch, authToken, view]);
  
  // Login handler
  const handleLogin = async (email, password) => {
    try {
      const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setCookie('authToken', data.token);
          setAuthToken(data.token);
          window.location.reload();
          return { success: true };
        } else {
          throw new Error('No token received from server');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    deleteCookie('authToken');
    setAuthToken(null);
    setView('login');
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({
      patient: '',
      doctor: '',
      reason: '',
      general: ''
    });
    
    // Validate form
    let valid = true;
    const newErrors = { patient: '', doctor: '', reason: '', general: '' };
    
    if (!patientId) {
      newErrors.patient = 'Please select a patient';
      valid = false;
    }
    
    if (!doctorId) {
      newErrors.doctor = 'Please select a doctor';
      valid = false;
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Please enter a reason for the visit';
      valid = false;
    }
    
    setErrors(newErrors);
    
    if (!valid) {
      return;
    }
    
    // Show loading state
    setSubmitting(true);
    
    // Submit form
    try {
      const formData = {
        patient: patientId,
        doctor: doctorId,
        reason: reason.trim(),
        isDischarged: false
      };
      
      const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/hospital-ledger/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.status === 201 || response.ok) {
        const result = await response.json();
        setFormMessage({
          type: 'success',
          message: `Patient registration successful! Ledger ID: ${result.id}`
        });
        
        // Refresh token on successful submission
        setCookie('authToken', authToken);
        
        // Reset form
        setPatientSearch('');
        setPatientId('');
        setDoctorSearch('');
        setDoctorId('');
        setReason('');
      } else if (response.status === 401) {
        // Token expired during submission
        deleteCookie('authToken');
        setAuthToken(null);
        setView('login');
        return;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setFormMessage({
        type: 'error',
        message: error.message || 'An error occurred during registration. Please try again later.'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle ripple effect on button click
  const createRipple = (e) => {
    if (!e.isTrusted) return; // Only for real clicks
    
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.width = '1px';
    ripple.style.height = '1px';
    ripple.style.background = 'rgba(255, 255, 255, 0.7)';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.borderRadius = '50%';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.animation = 'ripple 0.6s linear';
    ripple.style.opacity = '1';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 700);
  };
  
  // Login form component
  const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const handleLoginSubmit = async (e) => {
      e.preventDefault();
      setIsLoggingIn(true);
      setLoginError('');
      
      const result = await handleLogin(email, password);
      
      if (!result.success) {
        setLoginError(result.error);
      }
      
      setIsLoggingIn(false);
    };
    
    return (
      <div className="auth-container fade-in">
        <h2><FontAwesomeIcon icon={faHospital} /> Please Login to Continue</h2>
        <p>You need to be logged in to access the hospital portal.</p>
        
        <form id="login-form" onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          {loginError && <div className="error-message visible">{loginError}</div>}
          
          <div className="form-group">
            <button 
              type="submit" 
              disabled={isLoggingIn}
              onClick={createRipple}
            >
              {isLoggingIn ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Logging in...
                </>
              ) : 'Log In'}
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Role prompt component
  const RolePrompt = () => {
    return (
      <div className="auth-container fade-in">
        <h2><FontAwesomeIcon icon={faHospital} /> Hospital Registration Required</h2>
        <p>You need to be registered as a hospital to manage patients.</p>
        <button id="become-hospital" onClick={createRipple}>
          <FontAwesomeIcon icon={faHospital} /> Become a Hospital
        </button>
        <button id="logout-btn" onClick={handleLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} /> Logout
        </button>
      </div>
    );
  };
  
  // Registration form component
  const RegistrationForm = () => {
    return (
      <form id="patient-registration-form" className="visible" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2><FontAwesomeIcon icon={faHospital} /> Hospital Patient Registration</h2>
          {currentHospital && (
            <div className="hospital-info">
              <span>Hospital: {currentHospital.name}</span>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
              </button>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="patient-search">
            <FontAwesomeIcon icon={faUser} /> Patient: 
            <span className="tooltip">
              <span className="tooltip-text">Search by name, ID, or phone number</span>
            </span>
          </label>
          <div className="dropdown-container">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input 
                type="text" 
                id="patient-search"
                ref={patientSearchRef}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Start typing to search patients..." 
                autoComplete="off"
              />
            </div>
            {showPatientResults && (
              <div 
                id="patient-results" 
                ref={patientResultsRef}
                className={`dropdown-results ${showPatientResults ? 'visible' : ''}`}
              >
                {patientResults.length === 0 && (
                  <div className="dropdown-item">No patients found</div>
                )}
                {patientResults.map((patient, index) => (
                  patient.error ? (
                    <div key="error" className="dropdown-item error">
                      {patient.message}
                    </div>
                  ) : (
                    <div 
                      key={patient.id || index} 
                      className="dropdown-item"
                      onClick={() => {
                        setPatientSearch(patient.name);
                        setPatientId(patient.id);
                        setShowPatientResults(false);
                        setErrors({...errors, patient: ''});
                      }}
                    >
                      {patient.name} ({patient.age}, {patient.bloodGroup})
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
          {errors.patient && (
            <div className="error-message visible">{errors.patient}</div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="doctor-search">
            <FontAwesomeIcon icon={faUserMd} /> Doctor: 
            <span className="tooltip">
              <span className="tooltip-text">Search by name or specialty</span>
            </span>
          </label>
          <div className="dropdown-container">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input 
                type="text" 
                id="doctor-search"
                ref={doctorSearchRef}
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Start typing to search doctors..." 
                autoComplete="off"
              />
            </div>
            {showDoctorResults && (
              <div 
                id="doctor-results" 
                ref={doctorResultsRef}
                className={`dropdown-results ${showDoctorResults ? 'visible' : ''}`}
              >
                {doctorResults.length === 0 && (
                  <div className="dropdown-item">No doctors found</div>
                )}
                {doctorResults.map((doctor, index) => (
                  doctor.error ? (
                    <div key="error" className="dropdown-item error">
                      {doctor.message}
                    </div>
                  ) : (
                    <div 
                      key={doctor.id || index} 
                      className="dropdown-item"
                      onClick={() => {
                        setDoctorSearch(doctor.name);
                        setDoctorId(doctor.id);
                        setShowDoctorResults(false);
                        setErrors({...errors, doctor: ''});
                      }}
                    >
                      {doctor.name} ({doctor.license})
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
          {errors.doctor && (
            <div className="error-message visible">{errors.doctor}</div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="reason">
            <FontAwesomeIcon icon={faNotesMedical} /> Reason for Visit:
          </label>
          <input 
            type="text" 
            id="reason" 
            name="reason" 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required 
            placeholder="Brief description of symptoms or purpose"
          />
          {errors.reason && (
            <div className="error-message visible">{errors.reason}</div>
          )}
        </div>
        
        <div className="form-group">
          <button 
            type="submit" 
            id="submit-btn" 
            ref={submitBtnRef}
            disabled={submitting}
            onClick={createRipple}
          >
            {submitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Processing...
              </>
            ) : 'Register Patient'}
          </button>
        </div>
        
        {formMessage.message && (
          <div id="form-message">
            <div className={`${formMessage.type}-message visible`}>
              {formMessage.message}
            </div>
          </div>
        )}
      </form>
    );
  };
  
  // Loading component
  const Loading = () => {
    return (
      <div id="loading" className={errors.general ? '' : 'fade-in'}>
        {errors.general ? (
          <div className="error-container">
            <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
            <p>{errors.general}</p>
          </div>
        ) : (
          <>
            <FontAwesomeIcon icon={faSpinner} spin className="loader" />
            <p>Checking your credentials...</p>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="container">
      <h1>
        <FontAwesomeIcon icon={faHospital} /> Hospital Patient Registration
      </h1>
      
      {view === 'loading' && <Loading />}
      {view === 'login' && <LoginForm />}
      {view === 'role' && <RolePrompt />}
      {view === 'form' && <RegistrationForm />}
    </div>
  );
};

export default HospitalPatientRegistration;