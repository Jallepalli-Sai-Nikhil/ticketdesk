import React, { useState, useEffect } from 'react';
import './App.css';

declare const Plotly: {
  newPlot: (
    divId: string,
    data: Array<Record<string, unknown>>,
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => void;
};

// Interfaces
interface Ticket {
  id?: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY';
  createdAt?: string;
  updatedAt?: string;
  reportedBy?: string;
}

interface DashboardStats {
  total: number;
  statusCounts: {
    OPEN: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  priorityCounts: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

interface User {
  username: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

const API_BASE = 'http://localhost:8080/api';

export default function App() {
  // App States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Auth Gateway states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'mid' | 'strong' | ''>('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');

  // Core Data States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [search, setSearch] = useState('');
  const [selectedNavId, setSelectedNavId] = useState<'overview' | 'tickets' | 'reports' | 'team'>('overview');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem('sidebarExpanded') !== 'false';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Modal Triggers & Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inspectedTicket, setInspectedTicket] = useState<Ticket | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [resolutionInputText, setResolutionInputText] = useState('');
  
  // Real-life desk states persisted in LocalStorage
  const [ticketComments, setTicketComments] = useState<Record<number, Array<{ author: string; text: string; date: string }>>>(() => {
    const saved = localStorage.getItem('ticketComments');
    return saved ? JSON.parse(saved) : {};
  });

  const [ticketAssignees, setTicketAssignees] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem('ticketAssignees');
    return saved ? JSON.parse(saved) : {};
  });

  const [ticketResolutions, setTicketResolutions] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem('ticketResolutions');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('ticketComments', JSON.stringify(ticketComments));
  }, [ticketComments]);

  useEffect(() => {
    localStorage.setItem('ticketAssignees', JSON.stringify(ticketAssignees));
  }, [ticketAssignees]);

  useEffect(() => {
    localStorage.setItem('ticketResolutions', JSON.stringify(ticketResolutions));
  }, [ticketResolutions]);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(sidebarExpanded));
  }, [sidebarExpanded]);



  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [formCategory, setFormCategory] = useState<'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY'>('SOFTWARE');
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  // Settings State
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem('workspaceName') || 'IT Service Desk');

  // Fetch Tickets from API
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tickets`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
        setBackendStatus('ONLINE');
      } else {
        setBackendStatus('OFFLINE');
      }
    } catch (err) {
      setBackendStatus('OFFLINE');
      // Seed fallback tickets if offline
      setTickets([
        { id: 132, title: 'VPN drops every few minutes', description: 'User reports active VPN tunnels drop connections during video calls.', status: 'OPEN', priority: 'HIGH', category: 'NETWORK', reportedBy: 'employee', createdAt: '2026-08-09T10:00:00Z', updatedAt: '2026-08-09T10:00:00Z' },
        { id: 129, title: "Laptop won't power on", description: 'Operator states orange charging indicator glows but main board is dead.', status: 'OPEN', priority: 'HIGH', category: 'HARDWARE', reportedBy: 'admin', createdAt: '2026-08-09T09:30:00Z', updatedAt: '2026-08-09T09:30:00Z' },
        { id: 125, title: "Can't reset SSO password", description: 'SSO portal returns a SAML verification mismatch callback.', status: 'IN_PROGRESS', priority: 'MEDIUM', category: 'SECURITY', reportedBy: 'employee', createdAt: '2026-08-09T08:15:00Z', updatedAt: '2026-08-09T09:45:00Z' },
        { id: 118, title: 'Excel crashes on large sheets', description: 'Memory leaks when rendering pivot sheets above 50MB.', status: 'RESOLVED', priority: 'LOW', category: 'SOFTWARE', reportedBy: 'employee', createdAt: '2026-08-09T07:00:00Z', updatedAt: '2026-08-09T09:12:00Z' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
    }
  }, [currentUser]);

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    const body = authMode === 'login' 
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, password: authPassword, role: authRole };

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        if (authMode === 'register') {
          alert('Registration successful! Please sign in using your new credentials.');
          setAuthMode('login');
          setAuthUsername('');
          setAuthPassword('');
          setRegFirstName('');
          setRegLastName('');
          return;
        }
        const user: User = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
      } else {
        const msg = await response.text();
        setAuthError(msg || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      // Offline fallback login for demo purposes
      if (authMode === 'login' && authUsername === 'admin' && authPassword === 'admin123') {
        const fallbackUser: User = { username: 'admin', role: 'ADMIN' };
        localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
        setCurrentUser(fallbackUser);
        setBackendStatus('OFFLINE');
      } else if (authMode === 'login' && authUsername === 'employee' && authPassword === 'employee123') {
        const fallbackUser: User = { username: 'employee', role: 'EMPLOYEE' };
        localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
        setCurrentUser(fallbackUser);
        setBackendStatus('OFFLINE');
      } else {
        setAuthError('Connection refused. Run Java backend or use admin/admin123 fallback credentials.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  // Password visibility
  const toggleVis = () => {
    setShowPassword(!showPassword);
  };

  // Password strength check
  const checkStrength = (val: string) => {
    if (val.length === 0) {
      setPasswordStrength('');
      return;
    }
    let score = 0;
    if (val.length >= 6) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 1) setPasswordStrength('weak');
    else if (score === 2) setPasswordStrength('mid');
    else setPasswordStrength('strong');
  };

  // Create Incident
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Ticket = {
      title: formTitle,
      description: formDescription,
      status: 'OPEN',
      priority: formPriority,
      category: formCategory,
      reportedBy: currentUser?.username || 'employee'
    };

    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchTickets();
        setIsCreateModalOpen(false);
        setFormTitle('');
        setFormDescription('');
      } else {
        alert('Server rejected incident filing request.');
      }
    } catch (err) {
      // Offline fallback
      const offlineTicket: Ticket = {
        id: Math.floor(Math.random() * 1000),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTickets([offlineTicket, ...tickets]);
      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormDescription('');
    }
  };

  // Edit Incident
  const handleEditTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    const payload: Ticket = {
      ...editingTicket,
      title: formTitle,
      description: formDescription,
      priority: formPriority,
      category: formCategory
    };

    try {
      const response = await fetch(`${API_BASE}/tickets/${editingTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchTickets();
        setIsEditModalOpen(false);
        setEditingTicket(null);
      } else {
        alert('Server failed to apply modifications.');
      }
    } catch (err) {
      // Offline edit fallback
      setTickets(tickets.map(t => t.id === editingTicket.id ? payload : t));
      setIsEditModalOpen(false);
      setEditingTicket(null);
    }
  };

  // Delete Incident
  const handleDeleteTicket = async (id: number) => {
    if (!window.confirm(`Are you sure you want to archive Ticket #${id}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchTickets();
      } else {
        alert('Failed to delete target incident.');
      }
    } catch (err) {
      // Offline delete fallback
      setTickets(tickets.filter(t => t.id !== id));
    }
  };

  // Stepper lifecycle advance
  const handleStatusTransition = async (ticket: Ticket, newStatus: Ticket['status']) => {
    const payload: Ticket = { ...ticket, status: newStatus };
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchTickets();
        setInspectedTicket(null);
      }
    } catch (err) {
      // Offline transition fallback
      setTickets(tickets.map(t => t.id === ticket.id ? payload : t));
      setInspectedTicket(null);
    }
  };

  // Post a new comment to local timeline
  const handleAddComment = (ticketId: number) => {
    if (!newCommentText.trim()) return;
    const comment = {
      author: currentUser?.username || 'operator',
      text: newCommentText.trim(),
      date: new Date().toISOString()
    };
    const currentList = ticketComments[ticketId] || [];
    setTicketComments({
      ...ticketComments,
      [ticketId]: [...currentList, comment]
    });
    setNewCommentText('');
  };

  // Re-assign operator engineer
  const handleAssigneeChange = (ticketId: number, assigneeName: string) => {
    setTicketAssignees({
      ...ticketAssignees,
      [ticketId]: assigneeName
    });
    const comment = {
      author: 'system',
      text: `Assigned ticket to ${assigneeName}`,
      date: new Date().toISOString()
    };
    const currentList = ticketComments[ticketId] || [];
    setTicketComments({
      ...ticketComments,
      [ticketId]: [...currentList, comment]
    });
  };

  // Resolve with administrative notes
  const handleResolveWithNote = async (ticket: Ticket) => {
    if (!resolutionInputText.trim()) {
      alert('Please specify details regarding resolution actions.');
      return;
    }
    setTicketResolutions({
      ...ticketResolutions,
      [ticket.id!]: resolutionInputText.trim()
    });
    const comment = {
      author: 'system',
      text: `Resolved: ${resolutionInputText.trim()}`,
      date: new Date().toISOString()
    };
    const currentList = ticketComments[ticket.id!] || [];
    setTicketComments({
      ...ticketComments,
      [ticket.id!]: [...currentList, comment]
    });
    
    setResolutionInputText('');
    handleStatusTransition(ticket, 'RESOLVED');
  };

  // Authorized tickets based on operator role
  const authorizedTickets = tickets.filter(t => {
    if (currentUser?.role === 'EMPLOYEE') {
      return t.reportedBy === currentUser.username;
    }
    return true; // Admin views all
  });

  // Dynamic statistics
  const stats: DashboardStats = authorizedTickets.reduce((acc, t) => {
    acc.total++;
    if (acc.statusCounts[t.status] !== undefined) acc.statusCounts[t.status]++;
    if (acc.priorityCounts[t.priority] !== undefined) acc.priorityCounts[t.priority]++;
    return acc;
  }, {
    total: 0,
    statusCounts: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
    priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 }
  });

  const breachingCount = authorizedTickets.filter(t => t.priority === 'HIGH' && t.status === 'OPEN').length;

  // Filter logic
  const filteredTickets = authorizedTickets.filter(t => {
    // Search keyword query matching
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  // Interactive Plotly Charts Effect
  useEffect(() => {
    if (selectedNavId === 'reports' && !inspectedTicket) {
      const categories = ['SOFTWARE', 'HARDWARE', 'NETWORK', 'SECURITY'];
      const categoryLabels = ['Software', 'Hardware', 'Network', 'Access/Security'];
      const categoryValues = categories.map(cat => authorizedTickets.filter(t => t.category === cat).length);

      const priorities = ['LOW', 'MEDIUM', 'HIGH'];
      const priorityLabels = ['Low Urgency', 'Medium Urgency', 'High Criticality'];
      const priorityValues = priorities.map(pri => authorizedTickets.filter(t => t.priority === pri).length);

      // Pie chart markup
      Plotly.newPlot('plotly-pie-chart', [{
        values: categoryValues,
        labels: categoryLabels,
        type: 'pie',
        hole: 0.4,
        marker: {
          colors: ['#FF5A2E', '#0EA5A0', '#f5a623', '#171c26']
        },
        textinfo: 'percent',
        hoverinfo: 'label+percent+value',
        textposition: 'inside',
        automargin: true
      }], {
        title: {
          text: 'Category Incident Breakdown',
          font: { family: 'Outfit, sans-serif', size: 16, weight: '800', color: '#171c26' }
        },
        height: 330,
        margin: { t: 40, b: 20, l: 20, r: 20 },
        showlegend: true,
        legend: { orientation: 'h', x: 0.1, y: -0.1 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
      }, { responsive: true, displayModeBar: false });

      // Bar chart markup
      Plotly.newPlot('plotly-bar-chart', [{
        x: priorityLabels,
        y: priorityValues,
        type: 'bar',
        marker: {
          color: ['#0ea5a0', '#f5a623', '#FF5A2E'],
          line: { width: 0 }
        },
        width: 0.5
      }], {
        title: {
          text: 'Urgency Criticality Allocation',
          font: { family: 'Outfit, sans-serif', size: 16, weight: '800', color: '#171c26' }
        },
        height: 330,
        margin: { t: 40, b: 40, l: 30, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        yaxis: { dtick: 1, gridcolor: '#E7EAEF' },
        xaxis: { gridcolor: 'rgba(0,0,0,0)' }
      }, { responsive: true, displayModeBar: false });

      // Line chart markup
      Plotly.newPlot('plotly-line-chart', [{
        x: ['Aug 5', 'Aug 6', 'Aug 7', 'Aug 8', 'Aug 9'],
        y: [2, 4, 3, 5, authorizedTickets.length],
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#FF5A2E', width: 3 },
        marker: { size: 8, color: '#171c26' }
      }], {
        title: {
          text: 'Incident Inflow Timeline',
          font: { family: 'Outfit, sans-serif', size: 16, weight: '800', color: '#171c26' }
        },
        height: 330,
        margin: { t: 40, b: 40, l: 30, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        yaxis: { dtick: 1, gridcolor: '#E7EAEF' },
        xaxis: { gridcolor: 'rgba(0,0,0,0)' }
      }, { responsive: true, displayModeBar: false });

      // Horizontal Bar chart markup
      const statusLabels = ['Open', 'Working', 'Resolved', 'Closed'];
      const statusValues = [
        stats.statusCounts.OPEN,
        stats.statusCounts.IN_PROGRESS,
        stats.statusCounts.RESOLVED,
        stats.statusCounts.CLOSED
      ];
      Plotly.newPlot('plotly-horizontal-chart', [{
        type: 'bar',
        x: statusValues,
        y: statusLabels,
        orientation: 'h',
        marker: {
          color: ['#ff5a2e', '#f5a623', '#0ea5a0', '#171c26']
        }
      }], {
        title: {
          text: 'Operational Lifecycle Distribution',
          font: { family: 'Outfit, sans-serif', size: 16, weight: '800', color: '#171c26' }
        },
        height: 330,
        margin: { t: 40, b: 40, l: 70, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { dtick: 1, gridcolor: '#E7EAEF' },
        yaxis: { gridcolor: 'rgba(0,0,0,0)' }
      }, { responsive: true, displayModeBar: false });
    }
  }, [selectedNavId, tickets, inspectedTicket, authorizedTickets, stats]);

  // Render Category Helper
  const getCategoryDetails = (category: Ticket['category']) => {
    switch (category) {
      case 'NETWORK':
        return {
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20v-6M12 14a6 6 0 006-6H6a6 6 0 006 6z"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/></svg>,
          bgClass: 'bg-net', label: 'Network'
        };
      case 'HARDWARE':
        return {
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="4" width="16" height="11" rx="2"/><path d="M9 20h6M12 15v5"/></svg>,
          bgClass: 'bg-hw', label: 'Hardware'
        };
      case 'SECURITY':
        return {
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 9.5h6M9 13h4"/></svg>,
          bgClass: 'bg-acc', label: 'Access'
        };
      default:
        return {
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>,
          bgClass: 'bg-sw', label: 'Software'
        };
    }
  };

  // Helper date formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 1. AUTH SCREEN GATEWAY RENDERER
  if (!currentUser) {
    return (
      <div className="auth-container-wrapper">
        <div className={`auth-shell ${authMode === 'register' ? 'register-mode' : ''}`}>
          
          {/* Left panel: Brand Story */}
          <div className="brand-panel">
            <div className="brand-mark">
              <div className="glyph">
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 15l4-9 4 9M6 12h4M14 6h6M14 10h6M14 14h4M14 18h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span>Deskline</span>
            </div>

            <div className="brand-copy">
              <div className="eyebrow"><span className="dot"></span> Service desk, in one queue</div>
              <h1 className="display">Every ticket raised, tracked, and closed without the back‑and‑forth.</h1>
              <p>Sign in to triage requests, watch SLAs in real time, and hand off to the right engineer before anything breaches.</p>
            </div>
          </div>

          {/* Right panel: Form inputs */}
          <div className="form-panel">
            <div className="tabs">
              <button 
                id="tab-login" 
                className={authMode === 'login' ? 'active' : ''} 
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Log in
              </button>
              <button 
                id="tab-register" 
                className={authMode === 'register' ? 'active' : ''} 
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                Create account
              </button>
            </div>

            {authError && (
              <div style={{ background: 'rgba(230, 74, 32, 0.1)', border: '1px solid rgba(230, 74, 32, 0.3)', borderRadius: '12px', padding: '12px', color: 'var(--accent-dark)', fontSize: '13px', marginBottom: '16px' }}>
                {authError}
              </div>
            )}

            {/* Login panel */}
            <div id="panel-login" className={`auth-tab-panel ${authMode === 'login' ? 'active' : ''}`}>
              <div className="form-head">
                <h2>Welcome back</h2>
                <p>New to Deskline? <a onClick={() => setAuthMode('register')}>Create an account</a></p>
              </div>

              <form onSubmit={handleAuthSubmit}>
                <div className="field">
                  <label htmlFor="login-email">Work email</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-11z"/><path d="M5 7l7 5 7-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <input 
                      id="login-email" 
                      type="email" 
                      placeholder="you@company.com" 
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      autoComplete="username"
                      required 
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="login-pass">Password</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></svg>
                    <input 
                      id="login-pass" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      autoComplete="current-password"
                      required 
                    />
                    <span className="toggle-visibility" onClick={toggleVis}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </span>
                  </div>
                </div>

                <div className="row-between">
                  <label className="remember"><input type="checkbox" /> Keep me signed in</label>
                  <a className="forgot" href="#" onClick={(e) => { e.preventDefault(); alert('Demo password reset links dispatched.'); }}>Forgot password?</a>
                </div>

                <button className="btn-primary" type="submit">
                  Sign in
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </form>
            </div>

            {/* Register panel */}
            <div id="panel-register" className={`auth-tab-panel ${authMode === 'register' ? 'active' : ''}`}>
              <div className="form-head">
                <h2>Set up your desk</h2>
                <p>Already have an account? <a onClick={() => setAuthMode('login')}>Log in</a></p>
              </div>

              <form onSubmit={handleAuthSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="reg-first">First name</label>
                    <div className="input-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/></svg>
                      <input 
                        id="reg-first" 
                        type="text" 
                        placeholder="Alex" 
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="reg-last">Last name</label>
                    <div className="input-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/></svg>
                      <input 
                        id="reg-last" 
                        type="text" 
                        placeholder="Rowe" 
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="reg-email">Work email</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-11z"/><path d="M5 7l7 5 7-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <input 
                      id="reg-email" 
                      type="email" 
                      placeholder="you@company.com" 
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      autoComplete="new-username"
                      required 
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="reg-pass">Password</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></svg>
                    <input 
                      id="reg-pass" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Create a password" 
                      value={authPassword}
                      onChange={(e) => {
                        setAuthPassword(e.target.value);
                        checkStrength(e.target.value);
                      }}
                      autoComplete="new-password"
                      required 
                    />
                    <span className="toggle-visibility" onClick={toggleVis}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </span>
                  </div>
                  <div className={`strength ${passwordStrength}`}>
                    <span></span><span></span><span></span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="reg-role">Operator Role</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <select 
                      id="reg-role"
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
                      style={{ paddingLeft: '40px' }}
                    >
                      <option value="EMPLOYEE">Employee (Submitter)</option>
                      <option value="ADMIN">Admin (Operator)</option>
                    </select>
                  </div>
                </div>

                <label className="remember" style={{ marginTop: '-2px' }}>
                  <input type="checkbox" required /> I agree to the Terms and Privacy Policy
                </label>

                <button className="btn-primary" type="submit">
                  Create account
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </form>
            </div>

            <div className="fine-print">Free for teams up to 5 agents. No card required.</div>
          </div>

        </div>
      </div>
    );
  }

  // 2. MAIN LAYOUT AND NAVIGATION
  return (
    <div className="dashboard-container-wrapper">
      
      {/* Offline Alert Ticker */}
      {backendStatus === 'OFFLINE' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#f59e0b', color: 'white', padding: '6px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 600, zIndex: 1100, gap: '10px' }}>
          <span>Incident Gateway offline. Local cached data loaded.</span>
          <button onClick={fetchTickets} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Retry Sync</button>
        </div>
      )}

      <div className="dashboard-shell" style={{ marginTop: backendStatus === 'OFFLINE' ? '12px' : 0 }}>
        
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
          <div className="brand-container">
            <button className="brand" onClick={() => setSidebarExpanded(!sidebarExpanded)} title="Toggle Sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <span className="brand-text">Deskline</span>
          </div>
          
          <nav className="side-nav">
            <button 
              className={selectedNavId === 'overview' ? 'active' : ''} 
              onClick={() => { setSelectedNavId('overview'); setInspectedTicket(null); }}
              title="Overview"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
              <span className="nav-label">Overview</span>
            </button>
            <button 
              className={selectedNavId === 'tickets' ? 'active' : ''} 
              onClick={() => { setSelectedNavId('tickets'); setInspectedTicket(null); }}
              title="Tickets Queue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              <span className="nav-label">Incident Queue</span>
            </button>
            <button 
              className={selectedNavId === 'reports' ? 'active' : ''} 
              onClick={() => { setSelectedNavId('reports'); setInspectedTicket(null); }}
              title="Reports & Analytics"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              <span className="nav-label">Analytics</span>
            </button>
            <button 
              className={selectedNavId === 'team' ? 'active' : ''} 
              onClick={() => { setSelectedNavId('team'); setInspectedTicket(null); }}
              title="Support Operators"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              <span className="nav-label">Support Team</span>
            </button>
          </nav>
 
          <div className="side-bottom">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              title="Workspace Settings"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span className="nav-label">Settings</span>
            </button>
          </div>
        </aside>
 
        {/* Dashboard Main Content Panel */}
        <main className="panel">
          
          {/* Topbar Header */}
          <header className="topbar">
            <div>
              <h1 className="display">
                {selectedNavId === 'overview' ? 'Overview' :
                 selectedNavId === 'tickets' ? 'Tickets Registry' :
                 selectedNavId === 'reports' ? 'Performance Reports' :
                 selectedNavId === 'team' ? 'Our Team' :
                 'Dashboard'}
              </h1>
              <div className="sub">
                {workspaceName} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {loading && <span style={{ color: 'var(--accent)', marginLeft: '10px', fontWeight: 600 }}>· Refreshing data...</span>}
              </div>
            </div>

            <div className="top-actions">
              <div className="icon-btn" title="Search filter" onClick={() => setSelectedNavId('tickets')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5" strokeLinecap="round"/></svg>
              </div>
              <div className="icon-btn" title="Incidents status alerting" onClick={() => setSelectedNavId('overview')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"/><path d="M10 18a2 2 0 004 0"/></svg>
                {breachingCount > 0 && <div className="dot"></div>}
              </div>
              <div className="profile" onClick={() => setProfileMenuOpen(!profileMenuOpen)} style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}>
                <div className="avatar">
                  {currentUser.username.substring(0, 2)}
                </div>
                <div style={{ marginRight: '4px' }}>
                  <div className="name">{currentUser.username}</div>
                  <div className="role">{currentUser.role === 'ADMIN' ? 'Administrator' : 'Support Staff'}</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="2" style={{ transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'var(--ink-soft)' }}><polyline points="6 9 12 15 18 9"/></svg>
                
                {profileMenuOpen && (
                  <div className="profile-dropdown-card" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-dropdown-header">
                      <div className="name">{currentUser.username}</div>
                      <div className="role">{currentUser.role === 'ADMIN' ? 'Administrator' : 'Support Staff'}</div>
                    </div>
                    <div className="profile-dropdown-body">
                      <div className="dropdown-meta-item">
                        <span className="meta-label">Access Level:</span>
                        <span className="meta-value" style={{ color: currentUser.role === 'ADMIN' ? 'var(--accent)' : 'var(--teal)' }}>
                          {currentUser.role === 'ADMIN' ? 'Full Admin' : 'Staff Member'}
                        </span>
                      </div>
                      <div className="dropdown-meta-item">
                        <span className="meta-label">Permissions:</span>
                        <span className="meta-value" style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>
                          {currentUser.role === 'ADMIN'
                            ? 'View, assign, resolve & close all tickets'
                            : 'Raise & track own tickets'}
                        </span>
                      </div>
                      <div className="dropdown-meta-item">
                        <span className="meta-label">Status:</span>
                        <span className="meta-value" style={{ color: '#10b981' }}>● Active</span>
                      </div>
                    </div>
                    <button className="dropdown-logout-btn" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 3. CONDITIONAL PAGE VIEWS */}
          {inspectedTicket ? (
            <div className="overview-page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ marginBottom: '12px' }}>
                <button 
                  onClick={() => setInspectedTicket(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}
                >
                  ← Back to tickets
                </button>
              </div>

              <div className="card modal-split" style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: '24px' }}>
                
                {/* Left Column: Comments & Discussion timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid var(--line)', paddingRight: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Subject</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif' }}>{inspectedTicket.title}</h4>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: 'var(--ink-soft)' }}>{inspectedTicket.description}</p>
                  </div>

                  <div style={{ borderTop: '1px dashed var(--line)', paddingTop: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Operator Discussion</span>
                    
                    <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                      <div style={{ color: 'var(--ink-soft)', fontSize: '12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>[FILED]</span> Operator <strong>{inspectedTicket.reportedBy}</strong> raised incident at {formatDate(inspectedTicket.createdAt)}
                      </div>

                      {(ticketComments[inspectedTicket.id!] || []).map((comm, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '12px', background: comm.author === 'system' ? 'var(--surface-2)' : '#fff', padding: '8px', borderRadius: '8px', border: comm.author === 'system' ? 'none' : '1px solid var(--line)' }}>
                          {comm.author !== 'system' && (
                            <div className="mini-avatar" style={{ background: '#0EA5A0', width: '20px', height: '20px', fontSize: '9px' }}>
                              {comm.author.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{comm.author === 'system' ? 'System Log' : comm.author} <span style={{ fontWeight: 400, color: 'var(--ink-faint)', fontSize: '10px', marginLeft: '6px' }}>{formatDate(comm.date)}</span></div>
                            <div style={{ marginTop: '3px' }}>{comm.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Type a message..." 
                        value={newCommentText} 
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(inspectedTicket.id!);
                        }}
                        style={{ flex: 1, padding: '10px 14px', fontSize: '13px', borderRadius: '10px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)' }}
                      />
                      <button 
                        className="btn-primary" 
                        onClick={() => handleAddComment(inspectedTicket.id!)}
                        style={{ margin: 0, padding: '10px 18px', fontSize: '12px' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Timelines, Engineers, Resolution controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div className="inspect-stepper-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: 0 }}>
                    <div className={`inspect-step ${inspectedTicket.status === 'OPEN' ? 'active active-pulse' : 'done'}`}>
                      <span className="inspect-step-num">Step 1</span>
                      <span className="inspect-step-name" style={{ fontSize: '10px' }}>Open</span>
                    </div>
                    <div className={`inspect-step ${inspectedTicket.status === 'IN_PROGRESS' ? 'active active-pulse' : inspectedTicket.status !== 'OPEN' ? 'done' : ''}`}>
                      <span className="inspect-step-num">Step 2</span>
                      <span className="inspect-step-name" style={{ fontSize: '10px' }}>Working</span>
                    </div>
                    <div className={`inspect-step ${inspectedTicket.status === 'RESOLVED' ? 'active active-pulse' : inspectedTicket.status === 'CLOSED' ? 'done' : ''}`}>
                      <span className="inspect-step-num">Step 3</span>
                      <span className="inspect-step-name" style={{ fontSize: '10px' }}>Resolved</span>
                    </div>
                    <div className={`inspect-step ${inspectedTicket.status === 'CLOSED' ? 'active' : ''}`}>
                      <span className="inspect-step-num">Step 4</span>
                      <span className="inspect-step-name" style={{ fontSize: '10px' }}>Closed</span>
                    </div>
                  </div>

                  <div className="field">
                    <label>Assignee Allocation</label>
                    {currentUser.role === 'ADMIN' ? (
                      <select 
                        value={ticketAssignees[inspectedTicket.id!] || ''} 
                        onChange={(e) => handleAssigneeChange(inspectedTicket.id!, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        <option value="Nadia R.">Nadia R. (Network Lead)</option>
                        <option value="Jon T.">Jon T. (Hardware Support)</option>
                        <option value="Sam K.">Sam K. (SSO Security)</option>
                        <option value="Lior M.">Lior M. (Software Engineer)</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', fontSize: '13px' }}>
                        <div className="mini-avatar" style={{ background: '#FF5A2E', width: '22px', height: '22px', fontSize: '10px' }}>
                          {(ticketAssignees[inspectedTicket.id!] || 'UN').substring(0, 2)}
                        </div>
                        <strong>{ticketAssignees[inspectedTicket.id!] || 'Unassigned'}</strong>
                      </div>
                    )}
                  </div>

                  {ticketResolutions[inspectedTicket.id!] && (
                    <div style={{ background: 'var(--teal-soft)', border: '1px solid var(--teal)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#0b8580', fontWeight: 700, textTransform: 'uppercase' }}>Resolution Actions</div>
                      <div style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--ink)' }}>{ticketResolutions[inspectedTicket.id!]}</div>
                    </div>
                  )}

                  {currentUser.role === 'ADMIN' && inspectedTicket.status === 'IN_PROGRESS' && (
                    <div className="field">
                      <label>Resolution Action Remarks</label>
                      <input 
                        type="text" 
                        placeholder="Specify resolution actions..." 
                        value={resolutionInputText}
                        onChange={(e) => setResolutionInputText(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '10px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)' }}
                      />
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'OPEN' && (
                      <button 
                        className="btn-primary" 
                        style={{ background: '#f5a623', borderColor: '#f5a623', margin: 0, width: '100%' }}
                        onClick={() => handleStatusTransition(inspectedTicket, 'IN_PROGRESS')}
                      >
                        Start Progress
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'IN_PROGRESS' && (
                      <button 
                        className="btn-primary" 
                        style={{ background: '#0ea5a0', borderColor: '#0ea5a0', margin: 0, width: '100%' }}
                        onClick={() => handleResolveWithNote(inspectedTicket)}
                      >
                        Resolve Incident
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'RESOLVED' && (
                      <button 
                        className="btn-secondary" 
                        style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', margin: 0, width: '100%' }}
                        onClick={() => handleStatusTransition(inspectedTicket, 'CLOSED')}
                      >
                        Close Incident
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <>
              {selectedNavId === 'overview' && (
                <div className="overview-page-body">
                  
                  {currentUser.role === 'ADMIN' ? (
                    /* ==================== ADMINISTRATOR DASHBOARD ==================== */
                    <>
                      {/* Metric grids */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        
                        {/* Operational health Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>System Health</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>ONLINE</span>
                            </div>
                          </div>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>Gateway Active</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>H2 database instance sync</p>
                        </div>

                        {/* Active Queue Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total System Load</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>
                            {stats.statusCounts.OPEN + stats.statusCounts.IN_PROGRESS} / {stats.total}
                          </h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>{stats.statusCounts.OPEN} open · {stats.statusCounts.IN_PROGRESS} working</p>
                        </div>

                        {/* SLA Risk Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: breachingCount > 0 ? '4px solid var(--accent)' : '1px solid var(--line)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>SLA Alerts</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, color: breachingCount > 0 ? 'var(--accent)' : 'var(--ink)' }}>
                            {breachingCount} Alert{breachingCount !== 1 ? 's' : ''}
                          </h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Critical response active</p>
                        </div>

                        {/* Resolution SLA KPI */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Team Avg SLA</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>4.2 Hours</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>SLA target response: &lt; 8.0h</p>
                        </div>

                        {/* Active Dispatch Operator KPI */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Primary On-Call</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>Nadia R.</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Staff dispatcher active</p>
                        </div>

                      </div>

                      {/* Middle Section: SLA sparkline trend & Interactive Ticket Stubs */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        
                        {/* SLA Queue Card */}
                        <div className="card queue-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
                          <div>
                            <div className="callout">SLA at risk: {breachingCount}</div>
                            <div className="label">Open tickets</div>
                            <div className="value-row">
                              <div className="value">{stats.statusCounts.OPEN + stats.statusCounts.IN_PROGRESS}</div>
                              <span className="value-tag">active queue</span>
                            </div>
                            <div className="delta">
                              {stats.statusCounts.OPEN} pending raised · avg resolve 6h 40m
                            </div>
                          </div>

                          {/* Sparkline Graph */}
                          <svg className="sparkline" viewBox="0 0 320 90" preserveAspectRatio="none" style={{ marginTop: '20px' }}>
                            <defs>
                              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF5A2E" stopOpacity="0.22"/>
                                <stop offset="100%" stopColor="#FF5A2E" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            <path d="M0,55 C20,60 35,35 55,38 C75,41 85,68 105,66 C125,64 140,25 160,24 C180,23 195,52 215,50 C235,48 250,15 270,14 C290,13 305,30 320,20 L320,90 L0,90 Z" fill="url(#fillGrad)"/>
                            <path d="M0,55 C20,60 35,35 55,38 C75,41 85,68 105,66 C125,64 140,25 160,24 C180,23 195,52 215,50 C235,48 250,15 270,14 C290,13 305,30 320,20" fill="none" stroke="#FF5A2E" strokeWidth="2.5" strokeLinecap="round"/>
                            <circle cx="215" cy="50" r="4" fill="#FF5A2E" stroke="#fff" strokeWidth="2"/>
                          </svg>
                        </div>

                        {/* Interactive Ticket Stubs list */}
                        <div className="card" style={{ padding: '24px' }}>
                          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, marginBottom: '4px' }}>Incident ticket-stubs</h3>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '16px' }}>Click any live ticket stub to inspect diagnostic lifecycle details.</p>
                          
                          <div className="creative-stub-list">
                            {authorizedTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').slice(0, 3).length === 0 ? (
                              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '13px' }}>
                                All clear! No pending incidents.
                              </div>
                            ) : (
                              authorizedTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').slice(0, 3).map(t => {
                                const cat = getCategoryDetails(t.category);
                                return (
                                  <div key={t.id} className="ticket-stub" onClick={() => setInspectedTicket(t)}>
                                    <div className="stub-left">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)' }}>TCK-00{t.id}</span>
                                        <span className={`stub-priority-badge ${t.priority.toLowerCase()}`}>{t.priority}</span>
                                      </div>
                                      <h4 style={{ margin: '6px 0 2px 0', fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>{t.title}</h4>
                                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>category: {cat.label} · owner: {t.reportedBy || 'employee'}</div>
                                    </div>
                                    <div className="stub-right">
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{t.status}</span>
                                      <span style={{ fontSize: '9px', color: 'var(--ink-soft)', marginTop: '4px' }}>INSPECT →</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Quick Ops Deck Controls */}
                      <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, margin: '12px 0 6px 0' }}>Ops Command Deck</h3>
                      <div className="ops-control-grid">
                        <div className="ops-card" onClick={() => {
                          if (breachingCount > 0) {
                            alert(`Escalated ${breachingCount} critical incident alerts directly to primary on-call engineer Nadia R.`);
                          } else {
                            alert('No critical SLA alerts requiring escalation.');
                          }
                        }}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>Escalate SLA Alert</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Send urgent alerts to the on-call admin right away.</p>
                        </div>

                        <div className="ops-card" onClick={fetchTickets}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>Refresh Tickets</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Pull the latest tickets from the server right now.</p>
                        </div>

                        <div className="ops-card" onClick={() => setSelectedNavId('team')}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>Manage Support Staff</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Review operator permissions and contacts roster.</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ==================== EMPLOYEE DASHBOARD ==================== */
                    <>
                      {/* Metric grids */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        
                        {/* Operational health Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>System Health</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>ONLINE</span>
                            </div>
                          </div>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>Gateway Active</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>H2 database instance sync</p>
                        </div>

                        {/* My Open Tickets Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>My Active Tickets</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>
                            {authorizedTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} Queue
                          </h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Open & in progress incidents</p>
                        </div>

                        {/* My Resolved Tickets Card */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>My Resolved</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>
                            {authorizedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length} Done
                          </h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Resolved & closed histories</p>
                        </div>

                        {/* Resolution SLA KPI */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Target SLA Response</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>&lt; 8.0 Hours</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Corporate response tier</p>
                        </div>

                        {/* Active Dispatch Operator KPI */}
                        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>On-Call Dispatch</span>
                          <h3 style={{ margin: '8px 0 0 0', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>Nadia R.</h3>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)' }}>Active system paging dispatcher</p>
                        </div>

                      </div>

                      {/* Middle Section: Sparkline & Quick Creation Widget */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        
                        {/* SLA Queue Card */}
                        <div className="card queue-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
                          <div>
                            <div className="callout">System Health Connected</div>
                            <div className="label">My Active Incidents</div>
                            <div className="value-row">
                              <div className="value">{authorizedTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}</div>
                              <span className="value-tag">my backlog</span>
                            </div>
                            <div className="delta">
                              Average response feedback response within 4 hours
                            </div>
                          </div>

                          {/* Sparkline Graph */}
                          <svg className="sparkline" viewBox="0 0 320 90" preserveAspectRatio="none" style={{ marginTop: '20px' }}>
                            <defs>
                              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0EA5A0" stopOpacity="0.22"/>
                                <stop offset="100%" stopColor="#0EA5A0" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            <path d="M0,55 C20,60 35,35 55,38 C75,41 85,68 105,66 C125,64 140,25 160,24 C180,23 195,52 215,50 C235,48 250,15 270,14 C290,13 305,30 320,20 L320,90 L0,90 Z" fill="url(#fillGrad)"/>
                            <path d="M0,55 C20,60 35,35 55,38 C75,41 85,68 105,66 C125,64 140,25 160,24 C180,23 195,52 215,50 C235,48 250,15 270,14 C290,13 305,30 320,20" fill="none" stroke="#0EA5A0" strokeWidth="2.5" strokeLinecap="round"/>
                            <circle cx="215" cy="50" r="4" fill="#0EA5A0" stroke="#fff" strokeWidth="2"/>
                          </svg>
                        </div>

                        {/* Interactive Inline Ticket Creation Card */}
                        <div id="inline-creation-card" className="card" style={{ padding: '24px' }}>
                          <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, marginBottom: '4px' }}>Quick File Incident</h3>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '16px' }}>Submit a software, hardware, or access incident instantly to administrators.</p>
                          
                          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                              type="text" 
                              placeholder="Issue Summary (e.g. Printer Offline)" 
                              value={formTitle}
                              onChange={(e) => setFormTitle(e.target.value)}
                              required
                              style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '10px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)' }}
                            />
                            <textarea 
                              placeholder="Detailed description of the issue..." 
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              required
                              rows={2}
                              style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '10px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)', resize: 'none', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} style={{ padding: '8px 12px', fontSize: '12.5px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                                <option value="LOW">Low priority</option>
                                <option value="MEDIUM">Medium priority</option>
                                <option value="HIGH">High Criticality</option>
                              </select>
                              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')} style={{ padding: '8px 12px', fontSize: '12.5px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                                <option value="SOFTWARE">Software issue</option>
                                <option value="HARDWARE">Hardware issue</option>
                                <option value="NETWORK">Network failure</option>
                                <option value="SECURITY">Access/Security</option>
                              </select>
                            </div>
                            <button type="submit" className="btn-primary" style={{ margin: '6px 0 0 0', width: '100%' }}>Submit Incident</button>
                          </form>
                        </div>

                      </div>

                      {/* Quick Ops Deck Controls */}
                      <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, margin: '12px 0 6px 0' }}>Ops Command Deck</h3>
                      <div className="ops-control-grid">
                        <div className="ops-card" onClick={() => {
                          const element = document.getElementById('inline-creation-card');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                        }}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>File Incident Form</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Scroll instantly to the active workspace registration card.</p>
                        </div>

                        <div className="ops-card" onClick={fetchTickets}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>Refresh Tickets</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Pull the latest tickets from the server right now.</p>
                        </div>

                        <a className="ops-card" href="mailto:admin@company.com" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="ops-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          </div>
                          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, margin: 0, fontSize: '14.5px' }}>Contact Lead Administrator</h4>
                          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>Dispatch email queries directly to the Service Desk manager.</p>
                        </a>
                      </div>
                    </>
                  )}

                </div>
              )}
          

          {/* Incident Registry Grid View */}
          {selectedNavId === 'tickets' && (
            <div className="tickets-page-body">
              <div className="card" style={{ padding: '24px' }}>

                {/* Role-specific header toolbar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Filter incident keywords..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)' }}
                  />
                  {currentUser.role === 'EMPLOYEE' && (
                    <button 
                      className="btn-primary" 
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{ margin: 0, padding: '10px 20px', fontSize: '13px' }}
                    >
                      + Raise Incident
                    </button>
                  )}
                  {currentUser.role === 'ADMIN' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', padding: '4px 10px', background: 'var(--accent-soft)', borderRadius: '8px', color: 'var(--accent)' }}>
                        🛡 Admin View — All Incidents
                      </span>
                    </div>
                  )}
                </div>

                {filteredTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-soft)' }}>No tickets matched filter query.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTickets.map(t => {
                      const cat = getCategoryDetails(t.category);
                      const statusColor = t.status === 'OPEN' ? '#f59e0b' : t.status === 'IN_PROGRESS' ? '#3b82f6' : t.status === 'RESOLVED' ? '#10b981' : '#6b7280';
                      return (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div className={`cat-icon ${cat.bgClass}`}>
                              {cat.icon}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{t.title}</div>
                              <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                                #{t.id} ·{' '}
                                <span style={{ fontWeight: 700, color: statusColor }}>{t.status.replace('_', ' ')}</span>
                                {' · '}{t.priority}
                                {currentUser.role === 'ADMIN' && <span style={{ marginLeft: '8px', color: 'var(--ink-faint)' }}>· by {t.reportedBy}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setInspectedTicket(t)}>Inspect</button>
                            {/* Admin-only quick actions */}
                            {currentUser.role === 'ADMIN' && t.status === 'OPEN' && (
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#3b82f6', borderColor: '#93c5fd' }} onClick={() => handleStatusTransition(t, 'IN_PROGRESS')}>▶ Start</button>
                            )}
                            {currentUser.role === 'ADMIN' && t.status === 'IN_PROGRESS' && (
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#10b981', borderColor: '#6ee7b7' }} onClick={() => handleStatusTransition(t, 'RESOLVED')}>✓ Resolve</button>
                            )}
                            {currentUser.role === 'ADMIN' && t.status === 'RESOLVED' && (
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#6b7280', borderColor: '#d1d5db' }} onClick={() => handleStatusTransition(t, 'CLOSED')}>✗ Close</button>
                            )}
                            {currentUser.role === 'ADMIN' && (
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => t.id && handleDeleteTicket(t.id)}>Delete</button>
                            )}
                            {/* Employee-only edit action */}
                            {currentUser.role === 'EMPLOYEE' && t.status === 'OPEN' && (
                              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--teal)', borderColor: 'var(--teal)' }} onClick={() => { setEditingTicket(t); setIsEditModalOpen(true); }}>Edit</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Performance Report Charts */}
          {selectedNavId === 'reports' && (
            <div className="reports-page-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div id="plotly-pie-chart" className="plotly-chart-container"></div>
                <div id="plotly-bar-chart" className="plotly-chart-container"></div>
                <div id="plotly-line-chart" className="plotly-chart-container"></div>
                <div id="plotly-horizontal-chart" className="plotly-chart-container"></div>
              </div>
            </div>
          )}

          {/* Team Operator Profiles */}
          {selectedNavId === 'team' && (
            <div className="team-page-body">
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>Our Support Team</h3>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '20px' }}>Click the email icon next to anyone below to contact them directly.</p>
                
                <div className="team-grid">
                  {/* Administrators section */}
                  <div className="team-section">
                    <h4>Administrators</h4>
                    <div className="team-card">
                      <div className="team-avatar">AD</div>
                      <div className="team-info">
                        <div className="team-name">admin</div>
                        <div className="team-role">Administrator</div>
                      </div>
                      <a href="mailto:admin@company.com" className="email-btn" title="Send email">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </a>
                    </div>
                  </div>

                  {/* Support Employees section */}
                  <div className="team-section">
                    <h4>Support Staff</h4>
                    <div className="team-card">
                      <div className="team-avatar">EM</div>
                      <div className="team-info">
                        <div className="team-name">employee</div>
                        <div className="team-role">Standard Support Agent</div>
                      </div>
                      <a href="mailto:employee@company.com" className="email-btn" title="Email Operator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
          </>
          )}

        </main>
      </div>

      {/* 4. MODALS AND OVERLAYS */}
      
      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>File Incident Record</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </header>

            <form onSubmit={handleCreateTicket}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="field">
                  <label>Title</label>
                  <input 
                    type="text" 
                    placeholder="Brief summary of the issue"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input 
                    type="text" 
                    placeholder="Provide details about the incident"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>Priority</label>
                    <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')}>
                      <option value="SOFTWARE">Software</option>
                      <option value="HARDWARE">Hardware</option>
                      <option value="NETWORK">Network</option>
                      <option value="SECURITY">Access Security</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <footer className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ margin: 0 }}>File Incident</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Modify Incident Record</h3>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </header>

            <form onSubmit={handleEditTicketSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="field">
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input 
                    type="text" 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>Priority</label>
                    <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')}>
                      <option value="SOFTWARE">Software</option>
                      <option value="HARDWARE">Hardware</option>
                      <option value="NETWORK">Network</option>
                      <option value="SECURITY">Access Security</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <footer className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ margin: 0 }}>Save changes</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Workspace Profile Settings</h3>
              <button className="modal-close-btn" onClick={() => setIsSettingsOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </header>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Workspace Node Name</label>
                <input 
                  type="text" 
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    localStorage.setItem('workspaceName', e.target.value);
                  }}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-2)' }}
                />
              </div>
            </div>

            <footer className="modal-footer">
              <button className="btn-primary" style={{ margin: 0, width: '100%' }} onClick={() => setIsSettingsOpen(false)}>Apply Settings</button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
}
