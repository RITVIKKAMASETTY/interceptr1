import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faHospital, 
  faUserPlus, 
  faUsers, 
  faRightFromBracket,
  faVolumeUp, 
  faPause,
  faSpinner,
  faUserInjured,
  faUserMd,
  faProcedures,
  faCalendarCheck,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import '../ui/hspDashboard.css';

const HospitalDashboard = () => {
  const [hospital, setHospital] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarActive, setSidebarActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    isAuthorized: false,
    isLoggedIn: false
  });
  
  // New doctor form state
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    license: '',
    contact: ''
  });
  
  const hospitalId = window.location.pathname.split('/').pop();
  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get auth token from cookies
        const authToken = getCookie('authToken');
        
        // Load hospital information
        const response = await fetch(`${BASE_URL}/hospital-dashboard/${hospitalId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        setHospital(data.hospital || {});
        
        // Load doctors data
        const doctorsResponse = await fetch(`${BASE_URL}/doctors/${hospitalId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!doctorsResponse.ok) {
          throw new Error('Network response was not ok');
        }
        
        const doctorsData = await doctorsResponse.json();
        setDoctors(doctorsData.doctors || []);
        
        // Check hospital auth status
        checkHospitalAuth(authToken);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Initialize Google Translate
    initGoogleTranslate();
    
    // Clean up speech synthesis on unmount
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [hospitalId]);
  
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  
  const checkHospitalAuth = async (authToken) => {
    try {
      const response = await fetch(`${BASE_URL}/check-hospital/${hospitalId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        setAuthStatus({ isAuthorized: true, isLoggedIn: true });
      } else if (response.status === 403) {
        setAuthStatus({ isAuthorized: false, isLoggedIn: false });
      } else if (response.status === 401) {
        setAuthStatus({ isAuthorized: false, isLoggedIn: true });
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
    }
  };
  
  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };
  
  const openAddDoctorModal = () => {
    setShowModal(true);
  };
  
  const closeAddDoctorModal = () => {
    setShowModal(false);
  };
  
  const handleDoctorInputChange = (e) => {
    const { id, value } = e.target;
    setNewDoctor({ ...newDoctor, [id.replace('doctor', '').toLowerCase()]: value });
  };
  
  const addDoctor = async () => {
    try {
      const authToken = getCookie('authToken');
      const response = await fetch(`${BASE_URL}/doctors/${hospitalId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDoctor)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add doctor');
      }
      
      // Refresh doctors list
      const doctorsResponse = await fetch(`${BASE_URL}/doctors/${hospitalId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const doctorsData = await doctorsResponse.json();
      setDoctors(doctorsData.doctors || []);
      
      // Close modal and reset form
      setNewDoctor({
        name: '',
        specialty: '',
        license: '',
        contact: ''
      });
      closeAddDoctorModal();
    } catch (error) {
      console.error('Error adding doctor:', error);
      // Handle error (show message, etc.)
    }
  };
  
  const initGoogleTranslate = () => {
    // Add Google Translate script
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
    
    // Define initialization function
    window.googleTranslateElementInit = function() {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,hi,kn,te,mr',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        },
        'google_translate_element'
      );
    };
  };
  
  const toggleReadAloud = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      startSpeaking();
    }
  };
  
  const startSpeaking = () => {
    const contentToRead = document.querySelector('.main-content').textContent;
    
    const speech = new SpeechSynthesisUtterance();
    speech.text = contentToRead;
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 1;
    
    // Use the language selected in Google Translate if possible
    const currentLang = document.querySelector('.goog-te-combo')?.value || 'en-US';
    speech.lang = currentLang;
    
    window.speechSynthesis.speak(speech);
    setSpeaking(true);
    
    speech.onend = function() {
      setSpeaking(false);
    };
  };

  return (
    <div className="dashboard-container">
      {/* Background image */}
      <div className="bg-image">
        <img src="/api/placeholder/1200/800" alt="background" />
      </div>
      
      {/* Hamburger Menu Button */}
      <div className={`hamburger-menu ${sidebarActive ? 'active' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      
      {/* Overlay for mobile */}
      <div className={`overlay ${sidebarActive ? 'active' : ''}`} onClick={toggleSidebar}></div>
      
      {/* Sidebar Navigation */}
      <div className={`sidebar ${sidebarActive ? 'active' : ''}`}>
        <div className="logo">
          <div className="logo-icon">+</div>
          <div className="logo-text">AROGYAKOSH</div>
        </div>
      
        <div className="menu-item active">
          <FontAwesomeIcon icon={faHospital} />
          <span>Hospital</span>
        </div>
        
        <div className="menu-item">
          <FontAwesomeIcon icon={faUserPlus} />
          <span>
            <Link to="/route/add-patient/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Add Patients
            </Link>
          </span>
        </div>
        
        <div className="menu-item">
          <FontAwesomeIcon icon={faUsers} />
          <span>
            <Link to="/route/hospital-patients/" style={{ textDecoration: 'none', color: 'inherit' }}>
              View All Patients
            </Link>
          </span>
        </div>
        
        <div className="menu-item">
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>
            <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              Logout
            </Link>
          </span>
        </div>
        
        <div className="menu-item">
          <div id="google_translate_element"></div>
        </div>
        
        <div className="menu-item">
          <button id="readAloudBtn" onClick={toggleReadAloud} title="Read page content aloud">
            <FontAwesomeIcon icon={speaking ? faPause : faVolumeUp} /> {speaking ? 'Pause Reading' : 'Read Aloud'}
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="main-content">
        <div className="header">
          <h1 className="page-title">Hospital Dashboard</h1>
          {!authStatus.isLoggedIn && (
            <div id="header-auth">
              <Link to="/login" className="btn btn-primary">Login</Link>
            </div>
          )}
        </div>
        
        {error && (
          <div className="error">
            Unable to load hospital information. Please try again later.
          </div>
        )}
        
        {loading && (
          <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin /> Loading hospital information...
          </div>
        )}
        
        {authStatus.isAuthorized && !loading && (
          <div className="auth-section">
            <div className="auth-buttons">
              <Link to="/route/add-patient/" className="btn btn-primary">
                <FontAwesomeIcon icon={faUserPlus} /> Add Patient
              </Link>
              <Link to="/route/hospital-patients/" className="btn btn-success">
                <FontAwesomeIcon icon={faUsers} /> See All Patients
              </Link>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="content-card">
            <h2 className="card-title">Hospital Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Name</div>
                <div className="info-value">{hospital.name || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">License</div>
                <div className="info-value">{hospital.license || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Location</div>
                <div className="info-value">{hospital.location || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Contact</div>
                <div className="info-value">{hospital.contact || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="content-card">
            <h2 className="card-title">Doctors</h2>
            <div className="search-upload-container">
              <div className="search-container">
                <input type="text" className="search-input" placeholder="Search doctors..." id="doctor-search" />
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
              </div>
              <button className="upload-btn" onClick={openAddDoctorModal}>
                <FontAwesomeIcon icon={faUserPlus} /> Add Doctor
              </button>
            </div>
            <div className="doctors-container">
              {doctors.map((doc, index) => (
                <div className="doctor-card" key={index}>
                  <strong>Name:</strong> {doc.name} <br />
                  <strong>Age:</strong> {doc.age} <br />
                  <strong>License:</strong> {doc.license} <br />
                  <strong>Contact:</strong> {doc.contact} <br />
                  <Link to={`/route/doctor-dashboard/${doc.id}`} className="doctor-link">
                    View Doctor
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="content-card">
            <h2 className="card-title">Hospital Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faUserInjured} />
                </div>
                <div className="stat-value">{hospital.totalPatients || '-'}</div>
                <div className="stat-label">Total Patients</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faUserMd} />
                </div>
                <div className="stat-value">{doctors.length || '-'}</div>
                <div className="stat-label">Doctors</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faProcedures} />
                </div>
                <div className="stat-value">{hospital.availableBeds || '-'}</div>
                <div className="stat-label">Available Beds</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faCalendarCheck} />
                </div>
                <div className="stat-value">{hospital.appointmentsToday || '-'}</div>
                <div className="stat-label">Today's Appointments</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Doctor Modal */}
      {showModal && (
        <div className="upload-modal">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Add New Doctor</div>
              <span className="close-btn" onClick={closeAddDoctorModal}>&times;</span>
            </div>
            <div className="upload-form">
              <div className="form-group">
                <label htmlFor="doctorName" className="form-label">Doctor Name</label>
                <input 
                  type="text" 
                  id="doctorName" 
                  className="form-control" 
                  placeholder="Enter doctor's full name"
                  value={newDoctor.name}
                  onChange={handleDoctorInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="doctorSpecialty" className="form-label">Specialty</label>
                <select 
                  id="doctorSpecialty" 
                  className="form-control"
                  value={newDoctor.specialty}
                  onChange={handleDoctorInputChange}
                >
                  <option value="">Select Specialty</option>
                  <option value="general">General Medicine</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="neurology">Neurology</option>
                  <option value="orthopedics">Orthopedics</option>
                  <option value="pediatrics">Pediatrics</option>
                  <option value="gynecology">Gynecology</option>
                  <option value="dermatology">Dermatology</option>
                  <option value="ophthalmology">Ophthalmology</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="doctorLicense" className="form-label">License Number</label>
                <input 
                  type="text" 
                  id="doctorLicense" 
                  className="form-control" 
                  placeholder="Enter license number"
                  value={newDoctor.license}
                  onChange={handleDoctorInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="doctorContact" className="form-label">Contact Number</label>
                <input 
                  type="text" 
                  id="doctorContact" 
                  className="form-control" 
                  placeholder="Enter contact number"
                  value={newDoctor.contact}
                  onChange={handleDoctorInputChange}
                />
              </div>
              
              <button type="button" className="submit-btn" onClick={addDoctor}>Add Doctor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;