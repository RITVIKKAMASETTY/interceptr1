import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../ui/ptDashboard.css';

const PatientDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patientDetails, setPatientDetails] = useState({});
  const [personalDocuments, setPersonalDocuments] = useState([]);
  const [hospitalDocuments, setHospitalDocuments] = useState([]);
  const [isUserAuthorized, setIsUserAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  
  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

  // Get cookie helper function
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  // Validate auth token
  const validateAuthToken = () => {
    const authToken = getCookie('authToken');
    return authToken && authToken.length > 10; // Basic validation
  };

  // Redirect to login
  const redirectToLogin = () => {
    localStorage.setItem('redirectAfterLogin', window.location.href);
    navigate('/route/login/');
  };

  // Show toast notification
  const showToast = (message, type = 'success', duration = 3000) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    let iconHtml = '';
    switch(type) {
      case 'success':
        iconHtml = '✓';
        break;
      case 'error':
        iconHtml = '✕';
        break;
      case 'info':
        iconHtml = 'ℹ';
        break;
      case 'warning':
        iconHtml = '⚠';
        break;
    }
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.innerHTML = iconHtml;
    
    // Create content container
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      removeToast(toast);
    });
    
    // Add progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'toast-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress-bar';
    progressBar.style.animationDuration = `${duration}ms`;
    
    progressContainer.appendChild(progressBar);
    
    // Assemble toast
    toastContent.appendChild(messageSpan);
    toastContent.appendChild(closeButton);
    toast.appendChild(icon);
    toast.appendChild(toastContent);
    toast.appendChild(progressContainer);
    
    // Add to container
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Set auto-dismiss timer
    setTimeout(() => {
      removeToast(toast);
    }, duration);
    
    return toast;
  };

  const removeToast = (toast) => {
    toast.classList.remove('show');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  };

  // Get document icon based on type
  const getDocumentIcon = (docType) => {
    const iconMap = {
      'pdf': 'fa-file-pdf',
      'image': 'fa-file-image',
      'doc': 'fa-file-word',
      'xls': 'fa-file-excel',
      'lab': 'fa-flask',
      'prescription': 'fa-prescription',
      'report': 'fa-file-medical',
      'insurance': 'fa-file-invoice-dollar',
      'consent': 'fa-signature',
      'history': 'fa-notes-medical'
    };
    return iconMap[docType.toLowerCase()] || 'fa-file-medical-alt';
  };

  // Check patient authorization
  const checkPatientAuth = async () => {
    setAuthLoading(true);
    
    // Basic client-side validation first
    const authToken = getCookie('authToken');
    console.log("Auth Token:", authToken);
    if (!authToken || authToken.length < 10) {
      setIsUserAuthorized(false);
      setAuthLoading(false);
      console.log("2");
      return;
    }
    console.log(`Authorization : Token ${authToken}`);
    try {
      const response = await fetch(`${baseUrl}/check-patient/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });
      console.log("Response:", response.status);
      if (response.status === 200) {
        setIsUserAuthorized(true);
        console.log("if");
        fetchPatientDocuments(); // Refresh document list
      } else {
        console.log("else");
        setIsUserAuthorized(false);

      }
    } catch (error) {
      console.log("catched");
      console.error("Error checking patient authorization:", error);
      setIsUserAuthorized(false);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch patient details
  const fetchPatientDetails = async () => {
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(`${baseUrl}/patient-dashboard/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Token ${authToken}` : ''
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        setIsUserAuthorized(false);
        return;
      }
      
      const data = await response.json();
      if (data && data.patient) {
        setPatientDetails(data.patient);
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
  };

  // Fetch patient documents
  const fetchPatientDocuments = async () => {
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(`${baseUrl}/patient-documents/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Token ${authToken}` : ''
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        setIsUserAuthorized(false);
        return;
      }
      
      const data = await response.json();
      
      if (data) {
        if (data.patient && data.patient.length > 0) {
          setPersonalDocuments(data.patient.map(doc => ({
            id: doc.id,
            title: doc.name || 'Unnamed Document',
            date: new Date(doc.added).toLocaleDateString(),
            icon: getDocumentIcon(doc.type || 'unknown'),
            isPrivate: doc.isPrivate || false,
            isHospital: false,
            type: doc.type || 'unknown'
          })));
        } else {
          setPersonalDocuments([]);
        }
        
        if (data.hospital && data.hospital.length > 0) {
          setHospitalDocuments(data.hospital.map(doc => ({
            id: doc.id,
            title: doc.name || 'Unnamed Document',
            date: new Date(doc.added).toLocaleDateString(),
            icon: getDocumentIcon(doc.type || 'unknown'),
            isPrivate: doc.isPrivate || false,
            isHospital: true,
            type: doc.type || 'unknown'
          })));
        } else {
          setHospitalDocuments([]);
        }
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      setPersonalDocuments([]);
      setHospitalDocuments([]);
    }
  };

  // Toggle document visibility
  const toggleVisibility = async (documentId, isHospital) => {
    if (!isUserAuthorized || !validateAuthToken()) {
      console.error("Unauthorized attempt to toggle document visibility");
      alert("Authorization failed. Please log in again.");
      redirectToLogin();
      return;
    }
    
    const apiUrl = isHospital 
      ? `${baseUrl}/change-hospital-document/` 
      : `${baseUrl}/change-patient-document/`;
    
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
          'Authorization': `Token ${authToken}`
        },
        credentials: 'same-origin',
        body: JSON.stringify({ doc: documentId })
      });
      
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      showToast(`Visibility toggled successfully for ${isHospital ? 'hospital' : 'patient'} document ${documentId}`, 'success', 3000);
      
      // Refresh document lists
      fetchPatientDocuments();
    } catch (error) {
      console.error(`Error toggling visibility:`, error.message);
      alert('An error occurred while toggling document visibility.');
    }
  };

  // Confirm document deletion
  const confirmDelete = (docId, isHospital) => {
    if (!isUserAuthorized || !validateAuthToken()) {
      console.error("Unauthorized attempt to delete document");
      alert("Authorization failed. Please log in again to delete documents.");
      redirectToLogin();
      return;
    }
    
    // Check if modal already exists
    let modal = document.getElementById('delete-verification-modal');
    
    if (!modal) {
      // Create modal if it doesn't exist
      const modalDiv = document.createElement('div');
      modalDiv.innerHTML = `
        <div id="delete-verification-modal" class="modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Confirm Document Deletion</h2>
            <p>Please enter your verification code to delete this document:</p>
            <input type="password" id="verification-code" class="verification-input" placeholder="Verification Code">
            <div class="modal-buttons">
              <button id="cancel-delete" class="btn btn-secondary">Cancel</button>
              <button id="confirm-delete" class="btn btn-danger">Delete Document</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalDiv.firstElementChild);
      modal = document.getElementById('delete-verification-modal');
    }
    
    // Get buttons
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-delete');
    const confirmBtn = document.getElementById('confirm-delete');
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal on X click
    closeBtn.onclick = function() {
      modal.style.display = 'none';
    };
    
    // Close modal on Cancel click
    cancelBtn.onclick = function() {
      modal.style.display = 'none';
    };
    
    // Handle Delete confirmation
    confirmBtn.onclick = function() {
      const verificationCode = document.getElementById('verification-code').value;
      deleteDocument(docId, verificationCode, isHospital);
      modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  };

  // Delete document
  const deleteDocument = async (docId, verificationCode, isHospital) => {
    if (!isUserAuthorized || !validateAuthToken()) {
      console.error("Unauthorized attempt to delete document");
      alert("Authorization failed. Please log in again to delete documents.");
      redirectToLogin();
      return;
    }
    
    if (!verificationCode || verificationCode.trim() === '') {
      alert("Verification code is required.");
      return;
    }
    
    const authToken = getCookie('authToken');
    const apiEndpoint = isHospital
      ? `${baseUrl}/delete-hospital-document/`
      : `${baseUrl}/delete-patient-document/`;
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc: docId,
          verification_code: verificationCode
        })
      });
      
      if (response.status === 401 || response.status === 403) {
        if (response.status === 403 && verificationCode) {
          alert('Invalid verification code. Document not deleted.');
        } else {
          setIsUserAuthorized(false);
          alert("Your session has expired. Please log in again.");
          redirectToLogin();
        }
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          alert('Document deleted successfully');
          fetchPatientDocuments(); // Refresh document lists
        } else {
          alert('Failed to delete document');
        }
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error(`Error deleting document ${docId}:`, error);
      alert('Error deleting document');
    }
  };

  // View patient document
  const viewPatientDocument = async (docId) => {
    const authToken = getCookie('authToken');
    
    if (!authToken || authToken.length < 10) {
      alert("You need to be logged in to view this document");
      redirectToLogin();
      return;
    }
    
    try {
      const response = await fetch(`${baseUrl}/patients/${id}/documents/${docId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error("Not authorized to view this document");
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No URL in response');
      }
    } catch (error) {
      console.error(`Error viewing patient document ${docId}:`, error);
      
      if (error.message === "Not authorized to view this document") {
        alert("You don't have permission to view this document. Please request access.");
      } else {
        alert('Error accessing document. Please try again.');
      }
    }
  };

  // View hospital document
  const viewHospitalDocument = async (docId) => {
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(`${baseUrl}/hospital-documents-view/${docId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch hospital document: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No URL in response');
      }
    } catch (error) {
      console.error(`Error viewing hospital document ${docId}:`, error);
      alert('Error accessing hospital document');
    }
  };

  // Request patient access
  const requestPatientAccess = async (docId) => {
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(`${baseUrl}/create-patient-req/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc: docId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          alert('Access request submitted successfully');
        } else if (data.message) {
          alert(data.message);
        } else {
          alert('Failed to submit access request');
        }
      } else {
        throw new Error('Failed to submit access request');
      }
    } catch (error) {
      console.error(`Error requesting access for patient document ${docId}:`, error);
      alert('Error requesting access');
    }
  };

  // Request hospital access
  const requestHospitalAccess = async (docId) => {
    const authToken = getCookie('authToken');
    
    try {
      const response = await fetch(`${baseUrl}/create-hospital-req/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc: docId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          alert('Hospital document access request submitted successfully');
        } else if (data.message) {
          alert(data.message);
        } else {
          alert('Failed to submit hospital document access request');
        }
      } else {
        throw new Error('Failed to submit hospital document access request');
      }
    } catch (error) {
      console.error(`Error requesting access for hospital document ${docId}:`, error);
      alert('Error requesting hospital document access');
    }
  };

  // Add document function
  const addDocument = () => {
    if (!isUserAuthorized || !validateAuthToken()) {
      console.error("Unauthorized attempt to add document");
      alert("Authorization failed. Please log in again to add documents.");
      redirectToLogin();
      return;
    }
    navigate(`/route/patient-upload/?patient=${id}`);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Text-to-speech functionality
  const toggleReadAloud = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      const contentToRead = document.querySelector('.main-content').textContent;
      const speech = new SpeechSynthesisUtterance();
      speech.text = contentToRead;
      speech.volume = 1;
      speech.rate = 1;
      speech.pitch = 1;
      
      // Try to get current language from Google Translate
      const googleCombo = document.querySelector('.goog-te-combo');
      const currentLang = googleCombo ? googleCombo.value : 'en-US';
      speech.lang = currentLang;
      
      window.speechSynthesis.speak(speech);
      setSpeaking(true);
      
      speech.onend = function() {
        setSpeaking(false);
      };
    }
  };

 // Google Translate initialization
useEffect(() => {
  // Check if script already exists
  if (!document.querySelector('script[src*="translate_a/element.js"]')) {
    // Define the callback function if it doesn't exist yet
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function() {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,fr,de,ta,gu,kn',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          'google_translate_element'
        );
        
        // Apply saved language preference
        setTimeout(() => {
          const savedLang = localStorage.getItem('preferredLanguage');
          if (savedLang && document.querySelector('.goog-te-combo')) {
            document.querySelector('.goog-te-combo').value = savedLang;
            document.querySelector('.goog-te-combo').dispatchEvent(new Event('change'));
          }
        }, 1000);
      };
    }

    // Add Google Translate script
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }

  // Save language preference when changed
  const saveLangPreference = () => {
    const handleComboChange = (comboEl) => {
      if (comboEl) {
        comboEl.addEventListener('change', function() {
          const lang = this.value;
          localStorage.setItem('preferredLanguage', lang);
        });
      }
    };

    // Initial check
    const comboEl = document.querySelector('.goog-te-combo');
    if (comboEl) {
      handleComboChange(comboEl);
    } else {
      // If not available yet, try again after a delay
      setTimeout(() => {
        handleComboChange(document.querySelector('.goog-te-combo'));
      }, 1000);
    }
  };

  saveLangPreference();
}, []); // Empty dependency array so this runs only once

  // Document card component
  const DocumentCard = ({ doc }) => {
    const [accessStatus, setAccessStatus] = useState('loading');
    
    useEffect(() => {
      checkDocumentAccess(doc.id, doc.isHospital);
    }, [doc.id, doc.isHospital]);
    
    const checkDocumentAccess = async (docId, isHospital) => {
      const authToken = getCookie('authToken');
      const endpoint = isHospital 
        ? `${baseUrl}/hospital-document-check/${docId}` 
        : `${baseUrl}/patient-document-access/${docId}`;
        
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': authToken ? `Token ${authToken}` : ''
          }
        });
        
        if (response.status === 200) {
          setAccessStatus('granted');
        } else if (response.status === 401 || response.status === 403) {
          setAccessStatus('denied');
        } else {
          setAccessStatus('error');
        }
      } catch (error) {
        console.error(`Error checking document access for ID ${docId}:`, error);
        setAccessStatus('error');
      }
    };
    
    // Render access control buttons based on status
    const renderAccessControl = () => {
      switch (accessStatus) {
        case 'loading':
          return <div className="loading">Checking access...</div>;
        case 'granted':
          return (
            <button 
              className="doc-btn view-btn" 
              onClick={() => doc.isHospital ? viewHospitalDocument(doc.id) : viewPatientDocument(doc.id)}
            >
              View Document
            </button>
          );
        case 'denied':
          return (
            <button 
              className="doc-btn request-btn" 
              onClick={() => doc.isHospital ? requestHospitalAccess(doc.id) : requestPatientAccess(doc.id)}
            >
              Request Access
            </button>
          );
        case 'error':
          return (
            <button 
              className="doc-btn error-btn" 
              onClick={() => checkDocumentAccess(doc.id, doc.isHospital)}
            >
              Retry Access Check
            </button>
          );
        default:
          return null;
      }
    };
    
    return (
      <div className="document-card" data-id={doc.id}>
        {isUserAuthorized && (
          <div className="document-menu">
            <i className="fas fa-ellipsis-v menu-trigger"></i>
            <div className="document-menu-options">
              <div 
                className="menu-option edit-option" 
                onClick={() => toggleVisibility(doc.id, doc.isHospital)}
              >
                <i className="fas fa-edit"></i> {doc.isPrivate ? 'Make Public' : 'Make Private'}
              </div>
              <div 
                className="menu-option delete-option" 
                onClick={() => confirmDelete(doc.id, doc.isHospital)}
              >
                <i className="fas fa-trash"></i> Delete
              </div>
            </div>
          </div>
        )}
        <div className="document-icon">
          <i className={`fas ${doc.icon}`}></i>
        </div>
        <div className="document-title">{doc.title}</div>
        <div className="document-date">{doc.date}</div>
        <div className="document-visibility">
          {doc.isPrivate ? 
            <><i className="fas fa-lock"></i> Private</> : 
            <><i className="fas fa-unlock"></i> Public</>
          }
        </div>
        <div 
          id={`${doc.isHospital ? 'hospital' : 'patient'}-access-control-${doc.id}`} 
          className="document-access-control"
        >
          {renderAccessControl()}
        </div>
      </div>
    );
  };

  // Filter documents by search term
  const filterDocuments = (documents) => {
    if (!searchTerm) return documents;
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.date.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Initialize component
  useEffect(() => {
    if (!id) {
      console.error("No patient ID provided");
      alert("Error: No patient ID provided");
      return;
    }
    
    checkPatientAuth();
    fetchPatientDetails();
    fetchPatientDocuments();
    
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Check authentication status every 5 minutes
    const authCheckInterval = setInterval(checkPatientAuth, 300000);
    
    return () => {
      clearInterval(authCheckInterval);
    };
  }, [id]);

  // Navigation links
  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    // Clear auth token cookie
    document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to login page
    navigate('/route/login/');
  };

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">AROGYAKOSH</div>
        </div>
        
        <div className="sidebar-menu">
          <div className="menu-item active" onClick={() => handleNavigation(`/route/patient/${id}`)}>
            <i className="fas fa-file-medical"></i>
            <span>Patient Dashboard</span>
          </div>
          <div className="menu-item" onClick={() => handleNavigation('/route/chat')}>
            <i className="fas fa-user-md"></i>
            <span>Virtual Doctor</span>
          </div>
          <div className="menu-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </div>
        </div>
        
        <div className="sidebar-footer">
          <div id="google_translate_element"></div>
          <button id="readAloudBtn" className="read-aloud-btn" onClick={toggleReadAloud}>
            <i className="fas fa-volume-up"></i>
            {speaking ? ' Pause Reading' : ' Read Aloud'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" id="main-content">
        <div className="header">
          {!isSidebarOpen && (
            <button className="sidebar-toggle-mobile" onClick={toggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
          )}
          <h1 className="page-title">Patient Documents</h1>
        </div>
        
        <div className="content-card">
          <h2 className="card-title">Patient Information</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ marginRight: '20px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                <span id="patient-name">{patientDetails.name || ''}</span>
              </h3>
              <p style={{ margin: '5px 0', color: '#777' }}>
                <span id="patient-age">{patientDetails.age || ''}</span>
              </p>
              <p style={{ margin: '5px 0' }}>
                <span id="patient-blood-group">{patientDetails.bloodGroup || ''}</span>
              </p>
              <p style={{ margin: '5px 0' }}>
                Contact: <span id="patient-contact">{patientDetails.contact || ''}</span>
              </p>
              <p style={{ margin: '5px 0' }}>
              Emergency Contact: <span id="patient-emergency-contact">
                  {patientDetails.emergencyContact || ''}
                </span>
              </p>
              <p style={{ margin: '5px 0' }}>
                Address: <span id="patient-address">{patientDetails.address || ''}</span>
              </p>
            </div>
            <div className="qr-code-section">
              <div className="qr-code-title">PATIENT QR CODE</div>
              <img 
                id="patient-qr-code" 
                className="qr-code" 
                alt="Patient QR Code" 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=patient:${id}`}
              />
            </div>
          </div>
        </div>
        
        <div className="content-card">
          <div className="search-upload-container">
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search documents..." 
                id="document-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div id="auth-section" className="auth-section">
              {authLoading ? (
                <div className="loading">Checking authorization...</div>
              ) : isUserAuthorized ? (
                <button className="add-doc-btn" onClick={addDocument}>
                  <i className="fas fa-plus"></i> Add Document
                </button>
              ) : (
                <>
                  <div className="error">You need to log in to access this patient's dashboard</div>
                  <button className="login-btn" onClick={redirectToLogin}>
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
          
          <h2 className="card-title">Patient Documents</h2>
          
          <h3>Personal Documents</h3>
          <div className="slider-container">
            <button className="slider-btn prev-btn" onClick={() => document.getElementById('personal-slider').scrollBy({ left: -300, behavior: 'smooth' })}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="slider" id="personal-slider">
              {filterDocuments(personalDocuments).length > 0 ? (
                filterDocuments(personalDocuments).map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <p className="empty-message">No personal documents found.</p>
              )}
            </div>
            <button className="slider-btn next-btn" onClick={() => document.getElementById('personal-slider').scrollBy({ left: 300, behavior: 'smooth' })}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          
          <h3>Hospital Documents</h3>
          <div className="slider-container">
            <button className="slider-btn prev-btn" onClick={() => document.getElementById('hospital-slider').scrollBy({ left: -300, behavior: 'smooth' })}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="slider" id="hospital-slider">
              {filterDocuments(hospitalDocuments).length > 0 ? (
                filterDocuments(hospitalDocuments).map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))
              ) : (
                <p className="empty-message">No hospital documents found.</p>
              )}
            </div>
            <button className="slider-btn next-btn" onClick={() => document.getElementById('hospital-slider').scrollBy({ left: 300, behavior: 'smooth' })}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        
        <div id="toast-container" className="toast-container"></div>
      </div>
    </div>
  )
};


export default PatientDashboard;