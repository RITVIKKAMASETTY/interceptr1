import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, FileText, Hospital, AlertCircle } from 'lucide-react';
import '../ui/viewDoc.css';

function App() {
  const [currentTab, setCurrentTab] = useState('patientDoc');
  const [patientRequests, setPatientRequests] = useState([]);
  const [hospitalRequests, setHospitalRequests] = useState([]);
  const [loading, setLoading] = useState({ patient: true, hospital: true });
  const [error, setError] = useState({ patient: null, hospital: null });
  const [notification, setNotification] = useState({ message: '', isError: false, visible: false });

  const baseUrl = 'http://localhost:8000';

  // Helper function for making authenticated API requests
  const makeAuthRequest = async (url, method = 'GET', body = null) => {
    const authToken = getCookie('authToken');
    const csrftoken = getCookie('csrftoken');
    
    const headers = {
      'Authorization': `Token ${authToken}`,
      'Content-Type': 'application/json'
    };
    
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }
    
    const options = {
      method,
      headers,
      credentials: 'include'
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${baseUrl}${url}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Something went wrong');
    }
    
    return response.json();
  };

  // Function to get cookie by name
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Function to fetch patient document requests
  const fetchPatientRequests = async () => {
    setLoading(prev => ({ ...prev, patient: true }));
    setError(prev => ({ ...prev, patient: null }));
    
    try {
      const data = await makeAuthRequest('/patient-req-list/');
      setPatientRequests(data);
    } catch (error) {
      setError(prev => ({ ...prev, patient: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, patient: false }));
    }
  };

  // Function to fetch hospital document requests
  const fetchHospitalRequests = async () => {
    setLoading(prev => ({ ...prev, hospital: true }));
    setError(prev => ({ ...prev, hospital: null }));
    
    try {
      const data = await makeAuthRequest('/hospital-request-list/');
      setHospitalRequests(data);
    } catch (error) {
      setError(prev => ({ ...prev, hospital: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, hospital: false }));
    }
  };

  // Function to handle patient document access change
  const changePatientAccess = async (requestId) => {
    try {
      await makeAuthRequest('/change-patient-access/', 'POST', {
        doc: requestId
      });
      
      showNotification('Access permission updated successfully');
      fetchPatientRequests(); // Refresh the list
    } catch (error) {
      showNotification(error.message, true);
    }
  };

  // Function to handle hospital document access change
  const changeHospitalAccess = async (docId, userId) => {
    try {
      await makeAuthRequest('/change-hospital-access/', 'POST', {
        doc: docId,
        user: userId
      });
      
      showNotification('Access permission updated successfully');
      fetchHospitalRequests(); // Refresh the list
    } catch (error) {
      showNotification(error.message, true);
    }
  };

  // Function to decline patient document request
  const declinePatientRequest = async (requestId) => {
    try {
      await makeAuthRequest('/decline-patient-req/', 'POST', {
        id: requestId
      });
      
      showNotification('Request declined successfully');
      fetchPatientRequests(); // Refresh the list
    } catch (error) {
      showNotification(error.message, true);
    }
  };

  // Function to decline hospital document request
  const declineHospitalRequest = async (requestId) => {
    try {
      await makeAuthRequest('/decline-hospital-request/', 'POST', {
        id: requestId
      });
      
      showNotification('Request declined successfully');
      fetchHospitalRequests(); // Refresh the list
    } catch (error) {
      showNotification(error.message, true);
    }
  };

  // Function to show notification
  const showNotification = (message, isError = false) => {
    setNotification({ message, isError, visible: true });
    
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Helper function for status icon
  const StatusIcon = ({ sanctioned, declined }) => {
    if (declined) return <XCircle className="icon" color="#ef4444" />;
    if (sanctioned) return <CheckCircle className="icon" color="#10b981" />;
    return <Clock className="icon" color="#f59e0b" />;
  };

  // Helper function for status text
  const getStatusText = (sanctioned, declined) => {
    if (declined) return 'Declined';
    if (sanctioned) return 'Approved';
    return 'Pending';
  };

  // Helper function for status class
  const getStatusClass = (sanctioned, declined) => {
    if (declined) return 'status-declined';
    if (sanctioned) return 'status-approved';
    return 'status-pending';
  };

  // Function to switch tabs
  const switchTab = (tab) => {
    setCurrentTab(tab);
    
    // Fetch data when switching to tab
    if (tab === 'patientDoc') {
      fetchPatientRequests();
    } else if (tab === 'hospitalDoc') {
      fetchHospitalRequests();
    }
  };

  // Initialize the page
  useEffect(() => {
    fetchPatientRequests();
    fetchHospitalRequests();
  }, []);

  return (
    <div className="container">
      <h1>Document Access Management</h1>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${currentTab === 'patientDoc' ? 'tab-active' : ''}`} 
          onClick={() => switchTab('patientDoc')}
        >
          Patient Document Requests
        </button>
        <button 
          className={`tab ${currentTab === 'hospitalDoc' ? 'tab-active' : ''}`} 
          onClick={() => switchTab('hospitalDoc')}
        >
          Hospital Document Requests
        </button>
      </div>
      
      {/* Patient Document Requests Section */}
      <div className={`request-section ${currentTab !== 'patientDoc' ? 'hidden' : ''}`}>
        {loading.patient ? (
          <div className="message">
            <div className="loading-spinner"></div>
            <p>Loading patient document requests...</p>
          </div>
        ) : error.patient ? (
          <div className="error-message">
            <AlertCircle className="icon" />
            <span>{error.patient}</span>
          </div>
        ) : patientRequests.length === 0 ? (
          <div className="message">No patient document requests found</div>
        ) : (
          <div className="request-list">
            {patientRequests.map(req => (
              <div className="request-card" key={req.id}>
                <div className="request-info">
                  <h3>
                    <FileText className="icon" /> 
                    {req.doc.title || 'Document ' + req.doc.name}
                  </h3>
                  <p>
                    <User className="icon" /> 
                    Requested by: {req.to.username || 'User ' + req.to.username}
                  </p>
                  <p>
                    Status: 
                    <span className={getStatusClass(req.sanctioned, req.declined)}>
                      <StatusIcon sanctioned={req.sanctioned} declined={req.declined} />
                      {getStatusText(req.sanctioned, req.declined)}
                    </span>
                  </p>
                </div>
                <div className="action-buttons">
                  {!req.declined && (
                    <>
                      <button 
                        onClick={() => changePatientAccess(req.id)}
                        className={req.sanctioned ? 'btn-revoke' : 'btn-approve'}
                      >
                        {req.sanctioned ? 'Revoke' : 'Approve'}
                      </button>
                      {!req.sanctioned && (
                        <button 
                          onClick={() => declinePatientRequest(req.id)}
                          className="btn-decline"
                        >
                          Decline
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Hospital Document Requests Section */}
      <div className={`request-section ${currentTab !== 'hospitalDoc' ? 'hidden' : ''}`}>
        {loading.hospital ? (
          <div className="message">
            <div className="loading-spinner"></div>
            <p>Loading hospital document requests...</p>
          </div>
        ) : error.hospital ? (
          <div className="error-message">
            <AlertCircle className="icon" />
            <span>{error.hospital}</span>
          </div>
        ) : hospitalRequests.length === 0 ? (
          <div className="message">No hospital document requests found</div>
        ) : (
          <div className="request-list">
            {hospitalRequests.map(req => (
              <div className="request-card" key={req.id}>
                <div className="request-info">
                  <h3>
                    <FileText className="icon" /> 
                    {req.doc.title || 'Document ' + req.doc.name}
                  </h3>
                  <p>
                    <Hospital className="icon" /> 
                    Hospital: {req.doc.hospitalLedger?.hospital?.name || 'Unknown'}
                  </p>
                  <p>
                    <User className="icon" /> 
                    Requested by: {req.to.username}
                  </p>
                  <p>
                    Status: 
                    <span className={getStatusClass(req.sanctioned, req.declined)}>
                      <StatusIcon sanctioned={req.sanctioned} declined={req.declined} />
                      {getStatusText(req.sanctioned, req.declined)}
                    </span>
                  </p>
                </div>
                <div className="action-buttons">
                  {!req.declined && (
                    <>
                      <button 
                        onClick={() => changeHospitalAccess(req.id, req.to.id)}
                        className={req.sanctioned ? 'btn-revoke' : 'btn-approve'}
                      >
                        {req.sanctioned ? 'Revoke' : 'Approve'}
                      </button>
                      {!req.sanctioned && (
                        <button 
                          onClick={() => declineHospitalRequest(req.id)}
                          className="btn-decline"
                        >
                          Decline
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Notification */}
      {notification.visible && (
        <div className={`notification ${notification.isError ? 'notification-error' : 'notification-success'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default App;