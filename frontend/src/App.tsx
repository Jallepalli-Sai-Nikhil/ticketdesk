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
    // 1. Overview Page Chart
    if (selectedNavId === 'overview' && !inspectedTicket) {
      const categories = ['SOFTWARE', 'HARDWARE', 'NETWORK', 'SECURITY'];
      const categoryLabels = ['Software', 'Hardware', 'Network', 'Access/Security'];
      const categoryValues = categories.map(cat => authorizedTickets.filter(t => t.category === cat).length);
      
      const chartEl = document.getElementById('categoryChart');
      if (chartEl) {
        Plotly.newPlot('categoryChart', [{
          x: categoryLabels,
          y: categoryValues,
          type: 'bar',
          marker: {
            color: ['#2563eb', '#b4c5ff', '#00a572', '#ffb4ab'], // Obsidian Flux colors
            opacity: 0.85,
            line: {
              color: 'rgba(255,255,255,0.1)',
              width: 1
            }
          }
        }], {
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { family: 'Inter, sans-serif', color: '#c3c6d7' },
          xaxis: {
            gridcolor: 'rgba(255,255,255,0.05)',
            tickfont: { size: 12, color: '#c3c6d7' }
          },
          yaxis: {
            gridcolor: 'rgba(255,255,255,0.05)',
            zerolinecolor: 'rgba(255,255,255,0.1)',
            tickfont: { color: '#c3c6d7' }
          },
          margin: { l: 40, r: 10, t: 10, b: 30 }
        }, { responsive: true, displayModeBar: false });
      }
    }

    // 2. Reports Page Charts
    if (selectedNavId === 'reports' && !inspectedTicket) {
      const categories = ['SOFTWARE', 'HARDWARE', 'NETWORK', 'SECURITY'];
      const categoryLabels = ['Software', 'Hardware', 'Network', 'Access/Security'];
      const categoryValues = categories.map(cat => authorizedTickets.filter(t => t.category === cat).length);

      const priorities = ['LOW', 'MEDIUM', 'HIGH'];
      const priorityLabels = ['Low Urgency', 'Medium Urgency', 'High Criticality'];
      const priorityValues = priorities.map(pri => authorizedTickets.filter(t => t.priority === pri).length);

      // Pie chart
      Plotly.newPlot('plotly-pie-chart', [{
        values: categoryValues,
        labels: categoryLabels,
        type: 'pie',
        hole: 0.45,
        marker: {
          colors: ['#2563eb', '#b4c5ff', '#00a572', '#ffb4ab']
        },
        textinfo: 'percent',
        hoverinfo: 'label+percent+value',
        textposition: 'inside',
        automargin: true
      }], {
        title: {
          text: 'Category Incident Breakdown',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 16, weight: '700', color: '#e5e2e1' }
        },
        height: 330,
        margin: { t: 50, b: 20, l: 20, r: 20 },
        showlegend: true,
        legend: { orientation: 'h', x: 0.1, y: -0.1, font: { color: '#c3c6d7' } },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
      }, { responsive: true, displayModeBar: false });

      // Bar chart
      Plotly.newPlot('plotly-bar-chart', [{
        x: priorityLabels,
        y: priorityValues,
        type: 'bar',
        marker: {
          color: ['#00a572', '#ffb95f', '#ffb4ab'],
          line: { width: 0 }
        },
        width: 0.5
      }], {
        title: {
          text: 'Urgency Criticality Allocation',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 16, weight: '700', color: '#e5e2e1' }
        },
        height: 330,
        margin: { t: 50, b: 40, l: 30, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        yaxis: { dtick: 1, gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#c3c6d7' } },
        xaxis: { gridcolor: 'rgba(0,0,0,0)', tickfont: { color: '#c3c6d7' } }
      }, { responsive: true, displayModeBar: false });

      // Line chart
      Plotly.newPlot('plotly-line-chart', [{
        x: ['Aug 5', 'Aug 6', 'Aug 7', 'Aug 8', 'Aug 9'],
        y: [2, 4, 3, 5, authorizedTickets.length],
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#2563eb', width: 3 },
        marker: { size: 8, color: '#b4c5ff' }
      }], {
        title: {
          text: 'Incident Inflow Timeline',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 16, weight: '700', color: '#e5e2e1' }
        },
        height: 330,
        margin: { t: 50, b: 40, l: 30, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        yaxis: { dtick: 1, gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#c3c6d7' } },
        xaxis: { gridcolor: 'rgba(0,0,0,0)', tickfont: { color: '#c3c6d7' } }
      }, { responsive: true, displayModeBar: false });

      // Horizontal Bar chart
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
          color: ['#ffb4ab', '#ffb95f', '#00a572', '#b4c5ff']
        }
      }], {
        title: {
          text: 'Operational Lifecycle Distribution',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 16, weight: '700', color: '#e5e2e1' }
        },
        height: 330,
        margin: { t: 50, b: 40, l: 70, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { dtick: 1, gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#c3c6d7' } },
        yaxis: { gridcolor: 'rgba(0,0,0,0)', tickfont: { color: '#c3c6d7' } }
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
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background font-body-md p-4 selection:bg-primary-container selection:text-on-primary-container">
        <div className="w-full max-w-[440px] glass-card rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="material-symbols-outlined text-white text-2xl">dns</span>
            </div>
            <h1 className="font-title-md text-2xl font-bold text-primary tracking-tight">Nexus Control</h1>
            <p className="font-body-sm text-sm text-on-surface-variant mt-1">Enterprise IT Helpdesk Gateway</p>
          </div>

          {/* Mode Switch tabs */}
          <div className="flex border-b border-outline-variant/20 mb-6">
            <button 
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-colors border-b-2 ${authMode === 'login' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              Log In
            </button>
            <button 
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-colors border-b-2 ${authMode === 'register' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-error-container/20 border border-error-container/40 rounded-lg text-error text-xs">
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">First Name</label>
                  <input 
                    type="text" 
                    placeholder="Alex" 
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required 
                    className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Rowe" 
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    required 
                    className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Work Email</label>
              <input 
                type="email" 
                placeholder="you@company.com" 
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                autoComplete={authMode === 'login' ? 'username' : 'new-username'}
                required 
                className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required 
                className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Operator Role</label>
                <select 
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="EMPLOYEE">Employee (Submitter)</option>
                  <option value="ADMIN">Admin (Operator)</option>
                </select>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 mt-6"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </form>

          <p className="text-center text-xs text-on-surface-variant/60 mt-6">
            Free for teams up to 5 agents. No card required.
          </p>
        </div>
      </div>
    );
  }

  // 2. MAIN LAYOUT AND NAVIGATION
  return (
    <div className="flex bg-background text-on-background font-body-md min-h-screen antialiased selection:bg-primary-container selection:text-on-primary-container">
      
      {/* Offline Alert Ticker */}
      {backendStatus === 'OFFLINE' && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white py-1.5 px-4 flex justify-center items-center text-xs font-semibold z-[9999] gap-2">
          <span>Incident Gateway offline. Local cached data loaded.</span>
          <button onClick={fetchTickets} className="bg-white/20 border-none text-white rounded px-2 py-0.5 cursor-pointer text-[11px] font-bold hover:bg-white/30 transition-colors">Retry Sync</button>
        </div>
      )}

      {/* SideNavBar */}
      <nav className={`fixed left-0 top-0 h-full w-sidebar-width border-r border-outline-variant/20 bg-surface/80 backdrop-blur-xl z-50 flex flex-col py-6 transition-all duration-300 ${sidebarExpanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-6 mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="material-symbols-outlined text-white">dns</span>
            </div>
            <div>
              <h1 className="font-title-md text-base font-bold text-primary">Nexus Control</h1>
              <p className="font-body-sm text-[11px] text-on-surface-variant">Enterprise IT Ops</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 space-y-2">
          <button 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedNavId === 'overview' ? 'text-primary bg-primary/10 border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setSelectedNavId('overview'); setInspectedTicket(null); }}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </button>
          <button 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedNavId === 'tickets' ? 'text-primary bg-primary/10 border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setSelectedNavId('tickets'); setInspectedTicket(null); }}
          >
            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
            Tickets
          </button>
          <button 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedNavId === 'reports' ? 'text-primary bg-primary/10 border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setSelectedNavId('reports'); setInspectedTicket(null); }}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            Analytics
          </button>
          <button 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedNavId === 'team' ? 'text-primary bg-primary/10 border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setSelectedNavId('team'); setInspectedTicket(null); }}
          >
            <span className="material-symbols-outlined text-[20px]">groups</span>
            Support Team
          </button>
        </div>

        <div className="px-3 mt-auto space-y-2">
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </button>
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Log Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[260px] min-h-screen">
        
        {/* Topbar Header */}
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-260px)] h-16 bg-surface/50 backdrop-blur-xl border-b border-outline-variant/10 z-40 flex justify-between items-center px-8">
          <div className="flex items-center md:hidden">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-lg hover:bg-surface-container-high" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="font-title-md text-base font-bold text-primary ml-2">Nexus Control</h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input 
                className="w-full bg-surface-container-high/50 border border-outline-variant/30 rounded-full py-1.5 pl-10 pr-4 text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                placeholder="Search tickets, assets, users..." 
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedNavId('tickets'); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-high transition-all" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-on-surface">{currentUser.username}</div>
                <div className="text-[10px] text-on-surface-variant">{currentUser.role === 'ADMIN' ? 'Administrator' : 'Support Staff'}</div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
            </div>

            {profileMenuOpen && (
              <div className="absolute right-8 top-16 w-56 glass-card rounded-lg p-4 shadow-xl z-50 flex flex-col gap-3">
                <div className="border-b border-outline-variant/20 pb-2">
                  <div className="font-semibold text-sm text-on-surface">{currentUser.username}</div>
                  <div className="text-xs text-on-surface-variant">{currentUser.role === 'ADMIN' ? 'Administrator' : 'Support Staff'}</div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Level:</span>
                    <span className="font-medium text-primary">{currentUser.role === 'ADMIN' ? 'Full Admin' : 'Staff'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Status:</span>
                    <span className="text-green-500 font-medium">● Active</span>
                  </div>
                </div>
                <button className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 mt-2" onClick={handleLogout}>
                  <span className="material-symbols-outlined text-xs">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Canvas */}
        <main className="flex-1 p-6 md:p-8 pt-24 max-w-[1600px] mx-auto w-full">
          
          {/* Main Title Section */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">
                {inspectedTicket ? 'Incident Details' :
                 selectedNavId === 'overview' ? 'Command Center' :
                 selectedNavId === 'tickets' ? 'Tickets Queue' :
                 selectedNavId === 'reports' ? 'Performance Reports' :
                 selectedNavId === 'team' ? 'Our Support Team' :
                 'Dashboard'}
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                {inspectedTicket ? `Reviewing Ticket #${inspectedTicket.id}` :
                 selectedNavId === 'overview' ? 'Live ITSM Metrics & Global Status' :
                 selectedNavId === 'tickets' ? 'Triage, assign, and manage issues' :
                 selectedNavId === 'reports' ? 'Interactive analytics visualization' :
                 selectedNavId === 'team' ? 'Technical operators on-call status' :
                 workspaceName}
              </p>
            </div>
            
            {!inspectedTicket && currentUser.role === 'EMPLOYEE' && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary-container hover:bg-primary-container/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Raise Incident
              </button>
            )}
          </div>

          {/* Conditional Subviews */}
          {inspectedTicket ? (
            /* ==================== INCIDENT DETAIL INSPECT VIEW ==================== */
            <div className="glass-card rounded-xl p-6 shadow-xl flex flex-col md:grid md:grid-cols-3 gap-8">
              
              {/* Left Column: Description & Comments Timeline */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Subject Summary</span>
                  <h4 className="text-lg font-bold text-on-surface mt-1">{inspectedTicket.title}</h4>
                  <p className="text-sm text-on-surface-variant mt-2 bg-surface-container-low/30 border border-outline-variant/10 rounded-lg p-4 leading-relaxed">
                    {inspectedTicket.description}
                  </p>
                </div>

                <div className="border-t border-outline-variant/20 pt-6 space-y-4">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Operator Discussion</span>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    <div className="text-xs text-on-surface-variant/70 italic">
                      [System Alert] Ticket raised by <span className="font-semibold text-primary">{inspectedTicket.reportedBy}</span> on {formatDate(inspectedTicket.createdAt)}
                    </div>

                    {(ticketComments[inspectedTicket.id!] || []).map((comm, idx) => (
                      <div key={idx} className={`flex gap-3 text-xs p-3 rounded-lg border ${comm.author === 'system' ? 'bg-surface-container-low/20 border-outline-variant/10' : 'glass-card'}`}>
                        {comm.author !== 'system' && (
                          <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center font-bold text-[10px] text-white">
                            {comm.author.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-on-surface capitalize">{comm.author === 'system' ? 'System Audit' : comm.author}</span>
                            <span className="text-[10px] text-on-surface-variant/60">{formatDate(comm.date)}</span>
                          </div>
                          <p className="text-on-surface-variant">{comm.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Add comment..." 
                      value={newCommentText} 
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(inspectedTicket.id!); }}
                      className="flex-1 bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-4 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                    />
                    <button 
                      onClick={() => handleAddComment(inspectedTicket.id!)}
                      className="bg-primary-container hover:bg-primary-container/90 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Workflow Steps & Operator assignment */}
              <div className="space-y-6 border-t md:border-t-0 md:border-l border-outline-variant/20 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Status workflow */}
                  <div>
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-3">Workflow Lifecycle</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className={`p-2 rounded text-center text-[10px] font-semibold border ${inspectedTicket.status === 'OPEN' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-outline-variant/10 text-on-surface-variant/40'}`}>
                        Open
                      </div>
                      <div className={`p-2 rounded text-center text-[10px] font-semibold border ${inspectedTicket.status === 'IN_PROGRESS' ? 'border-primary bg-primary/10 text-primary' : inspectedTicket.status !== 'OPEN' ? 'border-outline-variant/20 text-on-surface-variant' : 'border-outline-variant/10 text-on-surface-variant/40'}`}>
                        Working
                      </div>
                      <div className={`p-2 rounded text-center text-[10px] font-semibold border ${inspectedTicket.status === 'RESOLVED' ? 'border-secondary bg-secondary/10 text-secondary' : inspectedTicket.status === 'CLOSED' ? 'border-outline-variant/20 text-on-surface-variant' : 'border-outline-variant/10 text-on-surface-variant/40'}`}>
                        Resolved
                      </div>
                      <div className={`p-2 rounded text-center text-[10px] font-semibold border ${inspectedTicket.status === 'CLOSED' ? 'border-outline-variant/30 bg-white/5 text-on-surface' : 'border-outline-variant/10 text-on-surface-variant/40'}`}>
                        Closed
                      </div>
                    </div>
                  </div>

                  {/* Assignee Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Assigned Engineer</label>
                    {currentUser.role === 'ADMIN' ? (
                      <select 
                        value={ticketAssignees[inspectedTicket.id!] || ''} 
                        onChange={(e) => handleAssigneeChange(inspectedTicket.id!, e.target.value)}
                        className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="">Unassigned</option>
                        <option value="Nadia R.">Nadia R. (Network Lead)</option>
                        <option value="Jon T.">Jon T. (Hardware Support)</option>
                        <option value="Sam K.">Sam K. (SSO Security)</option>
                        <option value="Lior M.">Lior M. (Software Engineer)</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-surface-container-high/20 border border-outline-variant/10 rounded-lg text-xs">
                        <span className="material-symbols-outlined text-sm text-primary">person</span>
                        <span className="font-semibold text-on-surface">{ticketAssignees[inspectedTicket.id!] || 'Unassigned'}</span>
                      </div>
                    )}
                  </div>

                  {/* Resolution Notes */}
                  {ticketResolutions[inspectedTicket.id!] && (
                    <div className="p-3 bg-secondary-container/10 border border-secondary-container/20 rounded-lg text-xs">
                      <div className="font-bold text-secondary uppercase tracking-wider text-[10px] mb-1">Resolution Summary</div>
                      <p className="text-on-surface-variant">{ticketResolutions[inspectedTicket.id!]}</p>
                    </div>
                  )}

                  {currentUser.role === 'ADMIN' && inspectedTicket.status === 'IN_PROGRESS' && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Resolution Notes</label>
                      <input 
                        type="text" 
                        placeholder="Detail the fix applied..." 
                        value={resolutionInputText}
                        onChange={(e) => setResolutionInputText(e.target.value)}
                        className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-6 border-t border-outline-variant/20">
                  <div className="flex gap-3">
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'OPEN' && (
                      <button 
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                        onClick={() => handleStatusTransition(inspectedTicket, 'IN_PROGRESS')}
                      >
                        Start Progress
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'IN_PROGRESS' && (
                      <button 
                        className="w-full bg-secondary-container hover:bg-secondary-container/90 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                        onClick={() => handleResolveWithNote(inspectedTicket)}
                      >
                        Resolve Incident
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && inspectedTicket.status === 'RESOLVED' && (
                      <button 
                        className="w-full bg-zinc-700 hover:bg-zinc-800 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                        onClick={() => handleStatusTransition(inspectedTicket, 'CLOSED')}
                      >
                        Close Incident
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setInspectedTicket(null)}
                    className="w-full border border-outline-variant/30 hover:bg-surface-container-high/20 text-on-surface-variant py-2 rounded-lg text-xs font-semibold transition-all text-center block"
                  >
                    Back to Queue
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ==================== OVERVIEW DASHBOARD VIEW ==================== */}
              {selectedNavId === 'overview' && (
                <div className="space-y-card-gap">
                  
                  {/* Bento Grid: Metrics cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap">
                    
                    {/* Operational health Card */}
                    <div className="glass-card rounded-xl p-5 flex flex-col justify-between h-[140px]">
                      <div className="flex justify-between items-start">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">System Status</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10b981]"></span>
                          <span className="text-[10px] font-bold text-green-500 uppercase">Online</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-stat-lg text-2xl font-bold text-on-surface">{backendStatus === 'ONLINE' ? 'Active' : 'Offline'}</div>
                        <div className="text-[11px] text-on-surface-variant mt-1">H2 Backend Gateway sync active</div>
                      </div>
                    </div>

                    {/* Active Queue Card */}
                    <div className="glass-card rounded-xl p-5 flex flex-col justify-between h-[140px]">
                      <div className="flex justify-between items-start">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Incident Queue Load</span>
                        <span className="material-symbols-outlined text-primary text-[20px]">confirmation_number</span>
                      </div>
                      <div>
                        <div className="font-stat-lg text-2xl font-bold text-on-surface">
                          {stats.statusCounts.OPEN + stats.statusCounts.IN_PROGRESS} / {stats.total}
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-1">{stats.statusCounts.OPEN} open · {stats.statusCounts.IN_PROGRESS} working</div>
                      </div>
                    </div>

                    {/* SLA Alerts Card */}
                    <div className="glass-card rounded-xl p-5 flex flex-col justify-between h-[140px]">
                      <div className="flex justify-between items-start">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">SLA Thresholds</span>
                        <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                      </div>
                      <div>
                        <div className={`font-stat-lg text-2xl font-bold ${breachingCount > 0 ? 'text-error' : 'text-on-surface'}`}>
                          {breachingCount} SLA Alert{breachingCount !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-1">Critical response time &lt; 2h</div>
                      </div>
                    </div>

                    {/* Avg SLA Target Card */}
                    <div className="glass-card rounded-xl p-5 flex flex-col justify-between h-[140px]">
                      <div className="flex justify-between items-start">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Average Resolve SLA</span>
                        <span className="material-symbols-outlined text-secondary text-[20px]">timer</span>
                      </div>
                      <div>
                        <div className="font-stat-lg text-2xl font-bold text-on-surface">4.2 Hours</div>
                        <div className="text-[11px] text-on-surface-variant mt-1">SLA Target resolution: 8.0h</div>
                      </div>
                    </div>
                  </div>

                  {/* Bento Grid Middle: Plotly Chart & Queue Gauge */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap">
                    
                    {/* Category Volume chart */}
                    <div className="glass-card rounded-xl p-6 lg:col-span-2 min-h-[380px] flex flex-col justify-between">
                      <h3 className="font-title-md text-base font-bold text-on-surface">Ticket Volume by Category</h3>
                      <div className="chart-container flex-1 w-full" id="categoryChart"></div>
                    </div>

                    {/* Priority Queue list / Quick submission */}
                    <div className="glass-card rounded-xl p-6 min-h-[380px] flex flex-col justify-between">
                      {currentUser.role === 'ADMIN' ? (
                        <>
                          <h3 className="font-title-md text-base font-bold text-on-surface">Current Queue by Priority</h3>
                          <div className="flex-1 flex flex-col justify-center gap-4 py-4">
                            <div className="w-full">
                              <div className="flex justify-between mb-1.5 text-xs">
                                <span className="text-error flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>Critical (High)</span>
                                <span className="text-on-surface font-semibold">{authorizedTickets.filter(t => t.priority === 'HIGH').length}</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-error shadow-[0_0_10px_rgba(255,180,171,0.5)]" style={{ width: `${Math.min(100, (authorizedTickets.filter(t => t.priority === 'HIGH').length / Math.max(1, authorizedTickets.length)) * 100)}%` }}></div>
                              </div>
                            </div>
                            <div className="w-full">
                              <div className="flex justify-between mb-1.5 text-xs">
                                <span className="text-tertiary flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tertiary"></span>Medium Priority</span>
                                <span className="text-on-surface font-semibold">{authorizedTickets.filter(t => t.priority === 'MEDIUM').length}</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-tertiary" style={{ width: `${Math.min(100, (authorizedTickets.filter(t => t.priority === 'MEDIUM').length / Math.max(1, authorizedTickets.length)) * 100)}%` }}></div>
                              </div>
                            </div>
                            <div className="w-full">
                              <div className="flex justify-between mb-1.5 text-xs">
                                <span className="text-primary flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span>Low Priority</span>
                                <span className="text-on-surface font-semibold">{authorizedTickets.filter(t => t.priority === 'LOW').length}</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (authorizedTickets.filter(t => t.priority === 'LOW').length / Math.max(1, authorizedTickets.length)) * 100)}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-title-md text-base font-bold text-on-surface mb-2">Quick File Incident</h3>
                          <form onSubmit={handleCreateTicket} className="space-y-3 flex-1 flex flex-col justify-center">
                            <input 
                              type="text" 
                              placeholder="Issue Summary (e.g. VPN down)" 
                              value={formTitle}
                              onChange={(e) => setFormTitle(e.target.value)}
                              required
                              className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                            />
                            <textarea 
                              placeholder="Describe details..." 
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              required
                              rows={2}
                              className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-1.5 px-3 text-xs text-on-surface focus:outline-none focus:border-primary resize-none font-inherit"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-1 px-2 text-xs text-on-surface">
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                              </select>
                              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')} className="bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-1 px-2 text-xs text-on-surface">
                                <option value="SOFTWARE">Software</option>
                                <option value="HARDWARE">Hardware</option>
                                <option value="NETWORK">Network</option>
                                <option value="SECURITY">Access</option>
                              </select>
                            </div>
                            <button type="submit" className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-2 rounded-lg text-xs font-semibold mt-2 transition-all">Submit Incident</button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Active Incidents Queue */}
                  <div className="glass-card rounded-xl p-0 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
                      <h3 className="font-title-md text-base font-bold text-on-surface">Active Incident Queue</h3>
                      <button onClick={() => setSelectedNavId('tickets')} className="text-primary hover:text-primary-fixed transition-colors text-xs font-semibold flex items-center gap-1">
                        View All Queue <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-high/30">
                            <th className="p-4 text-xs font-semibold text-on-surface-variant tracking-wider border-b border-outline-variant/20">ID</th>
                            <th className="p-4 text-xs font-semibold text-on-surface-variant tracking-wider border-b border-outline-variant/20">Subject</th>
                            <th className="p-4 text-xs font-semibold text-on-surface-variant tracking-wider border-b border-outline-variant/20">Category</th>
                            <th className="p-4 text-xs font-semibold text-on-surface-variant tracking-wider border-b border-outline-variant/20">Priority</th>
                            <th className="p-4 text-xs font-semibold text-on-surface-variant tracking-wider border-b border-outline-variant/20">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-outline-variant/10">
                          {authorizedTickets.slice(0, 5).map(t => {
                            const statusColor = t.status === 'OPEN' ? 'text-yellow-500' : t.status === 'IN_PROGRESS' ? 'text-primary' : t.status === 'RESOLVED' ? 'text-green-500' : 'text-zinc-500';
                            return (
                              <tr key={t.id} onClick={() => setInspectedTicket(t)} className="hover:bg-surface-container-high/40 transition-colors cursor-pointer">
                                <td className="p-4 text-primary font-mono font-semibold">INC-#{t.id}</td>
                                <td className="p-4 font-semibold text-on-surface">{t.title}</td>
                                <td className="p-4 text-on-surface-variant">{t.category}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider status-badge ${t.priority === 'HIGH' ? 'critical' : t.priority === 'MEDIUM' ? 'high' : 'normal'}`}>
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`font-semibold ${statusColor}`}>{t.status}</span>
                                </td>
                              </tr>
                            );
                          })}
                          {authorizedTickets.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-on-surface-variant/60">No active incidents reported.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== TICKETS QUEUE VIEW ==================== */}
              {selectedNavId === 'tickets' && (
                <div className="glass-card rounded-xl p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-outline-variant/20 pb-4">
                    <input 
                      type="text" 
                      placeholder="Search and filter incident keywords..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full sm:max-w-md bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-4 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    
                    <div className="flex gap-2">
                      {currentUser.role === 'ADMIN' && (
                        <span className="text-[10px] font-bold py-1 px-3 bg-primary/10 border border-primary/20 rounded-full text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[12px]">security</span>
                          Full Administrator Control View
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredTickets.map(t => {
                      const statusColor = t.status === 'OPEN' ? 'text-yellow-500' : t.status === 'IN_PROGRESS' ? 'text-primary' : t.status === 'RESOLVED' ? 'text-green-500' : 'text-zinc-500';
                      return (
                        <div key={t.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-surface-container-low/20 border border-outline-variant/10 rounded-xl gap-4 hover:border-primary/30 transition-all">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-primary font-bold text-xs">INC-#{t.id}</span>
                              <span className="text-xs text-on-surface-variant/50">· by {t.reportedBy}</span>
                            </div>
                            <h4 className="font-semibold text-sm text-on-surface mt-1">{t.title}</h4>
                            <div className="flex gap-2 items-center text-[10px] text-on-surface-variant mt-1">
                              <span className={`font-semibold ${statusColor}`}>{t.status.replace('_', ' ')}</span>
                              <span>·</span>
                              <span>{t.category}</span>
                              <span>·</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider status-badge ${t.priority === 'HIGH' ? 'critical' : t.priority === 'MEDIUM' ? 'high' : 'normal'}`}>
                                {t.priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none border border-outline-variant/30 hover:bg-surface-container-high/30 text-on-surface text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => setInspectedTicket(t)}>Inspect</button>
                            
                            {/* Admin Quick Status Updates */}
                            {currentUser.role === 'ADMIN' && t.status === 'OPEN' && (
                              <button className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => handleStatusTransition(t, 'IN_PROGRESS')}>Start</button>
                            )}
                            {currentUser.role === 'ADMIN' && t.status === 'IN_PROGRESS' && (
                              <button className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => { setInspectedTicket(t); setResolutionInputText(''); }}>Resolve</button>
                            )}
                            {currentUser.role === 'ADMIN' && t.status === 'RESOLVED' && (
                              <button className="flex-1 sm:flex-none bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => handleStatusTransition(t, 'CLOSED')}>Close</button>
                            )}
                            {currentUser.role === 'ADMIN' && (
                              <button className="flex-1 sm:flex-none border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => t.id && handleDeleteTicket(t.id)}>Delete</button>
                            )}
                            {currentUser.role === 'EMPLOYEE' && t.status === 'OPEN' && (
                              <button className="flex-1 sm:flex-none border border-primary/20 hover:bg-primary/10 text-primary text-xs font-semibold py-1.5 px-3 rounded-lg transition-all" onClick={() => { setEditingTicket(t); setFormTitle(t.title); setFormDescription(t.description); setFormPriority(t.priority); setFormCategory(t.category); setIsEditModalOpen(true); }}>Edit</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredTickets.length === 0 && (
                      <div className="text-center py-12 text-on-surface-variant/50 text-sm">No incidents matched your query filter.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== DETAILED REPORT CHARTS ==================== */}
              {selectedNavId === 'reports' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="glass-card rounded-xl p-6 flex flex-col justify-between min-h-[380px] shadow-xl">
                    <div id="plotly-pie-chart" className="plotly-chart-container"></div>
                  </div>
                  <div className="glass-card rounded-xl p-6 flex flex-col justify-between min-h-[380px] shadow-xl">
                    <div id="plotly-bar-chart" className="plotly-chart-container"></div>
                  </div>
                  <div className="glass-card rounded-xl p-6 flex flex-col justify-between min-h-[380px] shadow-xl">
                    <div id="plotly-line-chart" className="plotly-chart-container"></div>
                  </div>
                  <div className="glass-card rounded-xl p-6 flex flex-col justify-between min-h-[380px] shadow-xl">
                    <div id="plotly-horizontal-chart" className="plotly-chart-container"></div>
                  </div>
                </div>
              )}

              {/* ==================== TEAM MEMBER PROFILES ==================== */}
              {selectedNavId === 'team' && (
                <div className="glass-card rounded-xl p-6 shadow-xl space-y-6">
                  <div className="border-b border-outline-variant/20 pb-4">
                    <h3 className="font-title-md text-lg font-bold text-on-surface">IT Helpdesk Support Staff</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Operational engineers and lead dispatchers currently active on the node.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-surface-container-low/20 border border-outline-variant/10 rounded-xl flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-white shadow-md">
                        AD
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-on-surface">admin</h4>
                        <p className="text-xs text-primary font-medium mt-0.5">Manager & lead dispatcher</p>
                        <p className="text-[10px] text-green-500 mt-1">● Primary On-Call</p>
                      </div>
                      <a href="mailto:admin@company.com" className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-high rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </a>
                    </div>
                    <div className="p-4 bg-surface-container-low/20 border border-outline-variant/10 rounded-xl flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-white shadow-md">
                        NR
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-on-surface">Nadia R.</h4>
                        <p className="text-xs text-secondary font-medium mt-0.5">Network Lead Operations</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-1">Active operators console</p>
                      </div>
                      <a href="mailto:nadia@company.com" className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-high rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ==================== CREATE NEW TICKET MODAL OVERLAY ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] glass-card rounded-xl p-6 shadow-2xl space-y-4">
            <header className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h3 className="font-title-md text-base font-bold text-on-surface">Raise Helpdesk Incident</h3>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setIsCreateModalOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Subject Summary</label>
                <input 
                  type="text" 
                  placeholder="e.g. Printer Offline" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Detailed Description</label>
                <textarea 
                  placeholder="Provide logs or configuration detail..." 
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none font-inherit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Priority</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High Critical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')} className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary">
                    <option value="SOFTWARE">Software</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="NETWORK">Network</option>
                    <option value="SECURITY">Access Security</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-outline-variant/20 justify-end">
                <button type="button" className="border border-outline-variant/30 hover:bg-surface-container-high/20 text-on-surface-variant text-xs font-semibold py-2 px-4 rounded-lg transition-colors" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="bg-primary-container hover:bg-primary-container/90 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT INCIDENT MODAL OVERLAY ==================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] glass-card rounded-xl p-6 shadow-2xl space-y-4">
            <header className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h3 className="font-title-md text-base font-bold text-on-surface">Edit Helpdesk Incident</h3>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setIsEditModalOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            <form onSubmit={handleEditTicketSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Subject Summary</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Detailed Description</label>
                <textarea 
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary resize-none font-inherit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Priority</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')} className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as 'SOFTWARE' | 'HARDWARE' | 'NETWORK' | 'SECURITY')} className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary">
                    <option value="SOFTWARE">Software</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="NETWORK">Network</option>
                    <option value="SECURITY">Access Security</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-outline-variant/20 justify-end">
                <button type="button" className="border border-outline-variant/30 hover:bg-surface-container-high/20 text-on-surface-variant text-xs font-semibold py-2 px-4 rounded-lg transition-colors" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="bg-primary-container hover:bg-primary-container/90 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== WORKSPACE SETTINGS MODAL OVERLAY ==================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] glass-card rounded-xl p-6 shadow-2xl space-y-4">
            <header className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h3 className="font-title-md text-base font-bold text-on-surface">Workspace Settings</h3>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setIsSettingsOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Workspace Node Name</label>
                <input 
                  type="text" 
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    localStorage.setItem('workspaceName', e.target.value);
                  }}
                  className="w-full bg-surface-container-high/40 border border-outline-variant/30 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <footer className="pt-4 border-t border-outline-variant/20">
              <button className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-2 rounded-lg text-xs font-semibold transition-all" onClick={() => setIsSettingsOpen(false)}>
                Apply Workspace Settings
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
}
