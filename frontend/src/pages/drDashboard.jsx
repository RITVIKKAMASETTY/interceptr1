import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faRightFromBracket, faVolumeUp, faPhone, 
  faMapMarkerAlt, faPhoneAlt, faEnvelope, faPause, faCog
} from '@fortawesome/free-solid-svg-icons';
import { 
  faFacebookF, faTwitter, faGoogle, 
  faInstagram, faLinkedinIn, faGithub 
} from '@fortawesome/free-brands-svg-icons';
import '../ui/drDashboard.css';

const DoctorDashboard = () => {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sidebarActive, setSidebarActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speech, setSpeech] = useState(null);
  const [translatorInitialized, setTranslatorInitialized] = useState(false);

  useEffect(() => {
    // Initialize Google Translate only once
    if (!translatorInitialized) {
      const googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,kn,te,mr',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          'google_translate_element'
        );
      };

      // Add Google Translate script
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      // Make googleTranslateElementInit available globally
      window.googleTranslateElementInit = googleTranslateElementInit;
      
      setTranslatorInitialized(true);

      return () => {
        document.body.removeChild(script);
        delete window.googleTranslateElementInit;
      };
    }
  }, [translatorInitialized]);

  useEffect(() => {
    // Function to get cookie value by name
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    // Get the auth token from cookies
    const authToken = getCookie('authToken');
    // In a real application, you'd get the docId from route params or context
    const docId = new URLSearchParams(window.location.search).get('id') || 1; // Fallback to 1

    // Fetch doctor information from the API
    const fetchDoctorInfo = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/doctor-dashboard/${docId}`, {
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
        setDoctorInfo(data.doctor);
        setAppointments(data.appointments || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching doctor information:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchDoctorInfo();
  }, []);

  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };

  const toggleSpeaking = () => {
    if (speaking) {
      stopSpeaking();
    } else {
      startSpeaking();
    }
  };

  const startSpeaking = () => {
    // Get the main content to read
    const contentToRead = document.querySelector('.main-content').textContent;
    
    const speechObj = new SpeechSynthesisUtterance();
    speechObj.text = contentToRead;
    speechObj.volume = 1;
    speechObj.rate = 1;
    speechObj.pitch = 1;
    
    // Use the language selected in Google Translate if possible
    const currentLang = document.querySelector('.goog-te-combo')?.value || 'en-US';
    speechObj.lang = currentLang;
    
    window.speechSynthesis.speak(speechObj);
    setSpeaking(true);
    setSpeech(speechObj);
    
    speechObj.onend = function() {
      setSpeaking(false);
    };
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="doctor-dashboard">
      {/* Background gradient overlay */}
      <div className="bg-gradient"></div>
      
      {/* Hamburger Menu Button */}
      <div className={`hamburger-menu ${sidebarActive ? 'active' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      
      {/* Overlay for mobile */}
      {sidebarActive && <div className="overlay" onClick={toggleSidebar}></div>}
      
      {/* Sidebar Navigation */}
      <div className={`sidebar ${sidebarActive ? 'active' : ''}`}>
        <div className="logo">
          <div className="logo-icon">+</div>
          <div className="logo-text">AROGYAKOSH</div>
        </div>
        
        <div className="sidebar-divider"></div>
        
        <div className="menu-item active">
          <FontAwesomeIcon icon={faUser} />
          <span>Doctor Dashboard</span>
        </div>
        
        <div className="menu-item">
          <FontAwesomeIcon icon={faCog} />
          <span>Settings</span>
        </div>
        
        <div className="menu-item">
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>
            <a href="/login" style={{ textDecoration: 'none', color: 'inherit' }}>Logout</a>
          </span>
        </div>
        
        <div className="menu-item translate-section">
          <div id="google_translate_element"></div>
        </div>
        
        <div className="menu-item">
          <button id="readAloudBtn" className="text-to-speech-btn" onClick={toggleSpeaking}>
            <FontAwesomeIcon icon={speaking ? faPause : faVolumeUp} /> 
            <span>{speaking ? 'Pause Reading' : 'Read Aloud'}</span>
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className={`main-content ${sidebarActive ? 'shifted' : ''}`}>
        <div className="header">
          <h1 className="page-title">Doctor Dashboard</h1>
        </div>
        
        {error && (
          <div className="error-message">
            <p>Unable to load doctor information. Please try again later.</p>
          </div>
        )}
        
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading doctor information...</p>
          </div>
        )}
        
        {!loading && !error && doctorInfo && (
          <div className="dashboard-grid">
            <div className="content-card doctor-info">
              <h2 className="card-title">Doctor Information</h2>
              <div className="card-content">
                <div className="info-row">
                  <div className="info-col">
                    <h3>{doctorInfo.name || 'N/A'}</h3>
                    <p className="info-detail">Age: {doctorInfo.age || 'N/A'}</p>
                  </div>
                  <div className="info-col">
                    <p className="info-detail">
                      <FontAwesomeIcon icon={faPhone} /> {doctorInfo.contact || 'N/A'}
                    </p>
                    <p className="info-detail">
                      <FontAwesomeIcon icon={faMapMarkerAlt} /> {doctorInfo.location || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="content-card professional-details">
              <h2 className="card-title">Professional Details</h2>
              <div className="card-content">
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td>License Number</td>
                      <td>{doctorInfo.license || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Specialization</td>
                      <td>{doctorInfo.specialization || 'General Medicine'}</td>
                    </tr>
                    <tr>
                      <td>Experience</td>
                      <td>{doctorInfo.experience || '0'} years</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="content-card appointments">
              <h2 className="card-title">Upcoming Appointments</h2>
              <div className="card-content">
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length > 0 ? (
                      appointments.map((appointment, index) => (
                        <tr key={index}>
                          <td>{appointment.patientName || 'N/A'}</td>
                          <td>{appointment.date || 'N/A'}</td>
                          <td>{appointment.time || 'N/A'}</td>
                          <td>
                            <span className={`status-badge status-${appointment.status?.toLowerCase() || 'pending'}`}>
                              {appointment.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="no-data">
                        <td colSpan="4">No upcoming appointments</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
     
    </div>
  );
};

export default DoctorDashboard;