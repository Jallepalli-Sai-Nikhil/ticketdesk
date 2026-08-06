import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Lenis from 'lenis';
import './App.css';

interface Ticket {
  id?: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
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

interface ActivityLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'create' | 'update' | 'delete';
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string | number;
  action?: () => void;
  children?: NavItem[];
}

const API_BASE = '/api';

// Icon Helper Component (Dynamic inline SVGs matching Phosphor rounded/duotone design language)
const Icon = ({ name, className = '' }: { name: string; className?: string }) => {
  switch (name) {
    case 'all':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" fillOpacity="0.15" />
          <path d="M3 13h5.5l1.5 3h4l1.5-3H21" />
        </svg>
      );
    case 'open':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'progress':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 9 9h-9V3z" fill="currentColor" fillOpacity="0.25" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case 'critical':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l9 16H3l9-16z" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 8v5M12 16.5v.5" />
        </svg>
      );
    case 'resolved':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
          <path d="M8.5 12.5l2.5 2.5 5-5" />
        </svg>
      );
    case 'engineering':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fillOpacity="0.08" />
          <path d="M8 7L3 12l5 5M16 7l5 5-5 5M13.5 6l-3 12" />
        </svg>
      );
    case 'product':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.15" />
          <path d="M2 12l10 5 10-5M2 16l10 5 10-5" />
        </svg>
      );
    case 'security':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case 'h2':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="6" rx="8" ry="3" fill="currentColor" fillOpacity="0.15" />
          <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </svg>
      );
    case 'api':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.15" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'chevron':
      return (
        <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 5l7 7-7 7" />
        </svg>
      );
    case 'collapse':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <rect x="3" y="3" width="6" height="18" rx="1" fill="currentColor" fillOpacity="0.2" />
          <path d="M9 3v18" />
        </svg>
      );
    case 'sun':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case 'moon':
      return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    default:
      return null;
  }
};

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    statusCounts: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
    priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [selectedNavId, setSelectedNavId] = useState<string>('all-incidents');
  
  // Workspace Preferences & Settings State
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem('workspaceName') || 'Dev Workspace');
  const [defaultPriority, setDefaultPriority] = useState<Ticket['priority']>(() => (localStorage.getItem('defaultPriority') as Ticket['priority']) || 'LOW');
  const [autoSyncInterval, setAutoSyncInterval] = useState(() => localStorage.getItem('autoSyncInterval') || 'Off');

  // Sidebar Sizing and Mobile Drawer States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Accordion open sections list (dynamic map)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    incidents: true,
    departments: false,
    workspace: false
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<Ticket['status']>('OPEN');
  const [formPriority, setFormPriority] = useState<Ticket['priority']>(defaultPriority);
  const [formError, setFormError] = useState('');

  // Activity Log State
  const [activities, setActivities] = useState<ActivityLog[]>([
    { id: '1', timestamp: new Date(Date.now() - 500000), message: 'System connected to database.', type: 'update' },
    { id: '2', timestamp: new Date(Date.now() - 2500000), message: 'Actuator health monitor active.', type: 'create' }
  ]);

  const logActivity = (message: string, type: ActivityLog['type']) => {
    setActivities(prev => [
      { id: Math.random().toString(), timestamp: new Date(), message, type },
      ...prev.slice(0, 5)
    ]);
  };

  // Toggle Accordions
  const toggleAccordion = (id: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Sidebar Status Helpers
  const setSidebarStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPriorityFilter('ALL');
  };

  const setSidebarPriorityFilter = (priority: string) => {
    setPriorityFilter(priority);
    setStatusFilter('ALL');
  };

  // Dynamic Navigation Configuration Driven Structure
  const navConfig: NavItem[] = [
    {
      id: 'incidents',
      label: 'Incidents Registry',
      icon: 'all',
      children: [
        { 
          id: 'all-incidents', 
          label: 'All Incidents', 
          icon: 'all', 
          action: () => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setDeptFilter('ALL'); } 
        },
        { 
          id: 'unresolved-incidents', 
          label: 'Unresolved Open', 
          icon: 'open', 
          badge: stats.statusCounts.OPEN || undefined,
          action: () => { setSidebarStatusFilter('OPEN'); setDeptFilter('ALL'); } 
        },
        { 
          id: 'working-incidents', 
          label: 'Active Working', 
          icon: 'progress', 
          badge: stats.statusCounts.IN_PROGRESS || undefined,
          action: () => { setSidebarStatusFilter('IN_PROGRESS'); setDeptFilter('ALL'); } 
        },
        { 
          id: 'critical-incidents', 
          label: 'Critical Priority', 
          icon: 'critical', 
          badge: stats.priorityCounts.HIGH || undefined,
          action: () => { setSidebarPriorityFilter('HIGH'); setDeptFilter('ALL'); } 
        },
        { 
          id: 'resolved-incidents', 
          label: 'Resolved History', 
          icon: 'resolved', 
          action: () => { setSidebarStatusFilter('RESOLVED'); setDeptFilter('ALL'); } 
        }
      ]
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: 'engineering',
      children: [
        { id: 'dept-eng', label: 'Engineering Support', icon: 'engineering', action: () => { setDeptFilter('dept-eng'); setStatusFilter('ALL'); setPriorityFilter('ALL'); } },
        { id: 'dept-prod', label: 'Product Experience', icon: 'product', action: () => { setDeptFilter('dept-prod'); setStatusFilter('ALL'); setPriorityFilter('ALL'); } },
        { id: 'dept-sec', label: 'Security Operations', icon: 'security', action: () => { setDeptFilter('dept-sec'); setStatusFilter('ALL'); setPriorityFilter('ALL'); } }
      ]
    },
    {
      id: 'workspace-group',
      label: 'Workspace settings',
      icon: 'settings',
      children: [
        { id: 'db-console', label: 'Database Console', icon: 'h2', action: () => window.open('/h2-console') },
        { id: 'api-console', label: 'API Controls', icon: 'api', action: () => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setDeptFilter('ALL'); } },
        { id: 'workspace-settings', label: 'Preferences', icon: 'settings', action: () => setIsDarkMode(prev => !prev) }
      ]
    }
  ];

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const healthRes = await fetch(`${API_BASE}/actuator/health`).catch(() => null);
      if (!healthRes || !healthRes.ok) {
        const ticketsTest = await fetch(`${API_BASE}/tickets`).catch(() => null);
        if (!ticketsTest) {
          setBackendStatus('OFFLINE');
          setLoading(false);
          return;
        }
      }
      setBackendStatus('ONLINE');

      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/tickets`),
        fetch(`${API_BASE}/tickets/dashboard`)
      ]);

      if (ticketsRes.ok && statsRes.ok) {
        const ticketsData = await ticketsRes.json();
        const statsData = await statsRes.json();
        setTickets(ticketsData);
        setStats(statsData);
      } else {
        throw new Error('Failed to load data');
      }
    } catch (err) {
      console.error(err);
      setBackendStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().then(() => {
      setTimeout(() => {
        setGlobalLoading(false);
      }, 4500);
    });
  }, [fetchData]);

  // Auto-sync polling interval
  useEffect(() => {
    if (autoSyncInterval === 'Off') return;
    const intervalMs = autoSyncInterval === '10s' ? 10000 : autoSyncInterval === '30s' ? 30000 : 60000;
    const timer = setInterval(() => {
      fetchData();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoSyncInterval, fetchData]);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Mouse & Scroll Parallax Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) - 0.5;
      const y = (e.clientY / innerHeight) - 0.5;
      setMousePos({ x, y });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Sync theme with localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingTicket(null);
    setFormTitle('');
    setFormDescription('');
    setFormStatus('OPEN');
    setFormPriority(defaultPriority);
    setFormError('');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormTitle(ticket.title);
    setFormDescription(ticket.description);
    setFormStatus(ticket.status);
    setFormPriority(ticket.priority);
    setFormError('');
    setModalOpen(true);
  };

  // Submit Modal Actions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Title is required');
      return;
    }

    const payload: Ticket = {
      title: formTitle,
      description: formDescription,
      status: formStatus,
      priority: formPriority
    };

    try {
      let response;
      if (editingTicket && editingTicket.id) {
        response = await fetch(`${API_BASE}/tickets/${editingTicket.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        const result: Ticket = await response.json();
        setModalOpen(false);
        fetchData();
        logActivity(
          editingTicket 
            ? `Incident #${editingTicket.id} updated: "${result.title}"` 
            : `Incident submitted: "${result.title}"`,
          editingTicket ? 'update' : 'create'
        );
      } else {
        const errData = await response.json().catch(() => ({}));
        setFormError(errData.message || 'An error occurred while saving the ticket.');
      }
    } catch (err) {
      setFormError('Network error. Failed to reach the server.');
    }
  };

  // Delete Incident
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
        logActivity(`Archived incident #${id}`, 'delete');
      } else {
        alert('Failed to delete the ticket.');
      }
    } catch (err) {
      alert('Network error. Failed to delete ticket.');
    }
  };

  // Change Status
  const handleQuickStatusChange = async (ticket: Ticket, newStatus: Ticket['status']) => {
    const payload = { ...ticket, status: newStatus };
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchData();
        logActivity(`Incident #${ticket.id} status is now ${newStatus.replace('_', ' ')}`, 'update');
      }
    } catch (err) {
      console.error('Failed to change status: ', err);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
    
    let matchesDept = true;
    if (deptFilter === 'dept-eng') {
      const text = (ticket.title + " " + ticket.description).toLowerCase();
      matchesDept = text.includes('eng') || text.includes('support') || text.includes('db') || text.includes('api') || text.includes('code') || text.includes('bug') || text.includes('database') || text.includes('backend');
    } else if (deptFilter === 'dept-prod') {
      const text = (ticket.title + " " + ticket.description).toLowerCase();
      matchesDept = text.includes('prod') || text.includes('ux') || text.includes('ui') || text.includes('experience') || text.includes('client') || text.includes('design') || text.includes('frontend') || text.includes('user');
    } else if (deptFilter === 'dept-sec') {
      const text = (ticket.title + " " + ticket.description).toLowerCase();
      matchesDept = text.includes('sec') || text.includes('vuln') || text.includes('auth') || text.includes('login') || text.includes('access') || text.includes('firewall') || text.includes('leak') || text.includes('security');
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesDept;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const toggleTheme = (e: React.MouseEvent, targetDark: boolean) => {
    if (isDarkMode === targetDark) return;
    
    const doc = document as unknown as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (!doc.startViewTransition) {
      setIsDarkMode(targetDark);
      return;
    }
    
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--click-x', `${x}px`);
    document.documentElement.style.setProperty('--click-y', `${y}px`);
    
    doc.startViewTransition(() => {
      flushSync(() => {
        setIsDarkMode(targetDark);
      });
    });
  };

  const renderIncidentsTable = () => {
    return (
      <>
        <div className="panel-header">
          <div className="panel-titles">
            <h3 className="panel-name">Incidents Registry</h3>
            <p className="panel-desc">Showing {filteredTickets.length} active issue records</p>
          </div>

          <div className="table-quick-filters">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-select"
              title="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="toolbar-select"
              title="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mini-ticket-loader">
            <div className="mini-ticket">
              <div className="mini-stub"></div>
              <div className="mini-main">
                <span className="mini-bar"></span>
                <span className="mini-bar"></span>
                <span className="mini-bar"></span>
              </div>
            </div>
            <p>Syncing incidents registry...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="empty-saas">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <h4>No matching incidents</h4>
            <p>Try modifying your query tags or select another sidebar list.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="incidents-table">
              <thead>
                <tr>
                  <th>Incident Detail</th>
                  <th>Priority</th>
                  <th>Status State</th>
                  <th>Updated At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="table-row-item">
                    <td className="col-ticket-info">
                      <div className="ticket-title-group">
                        <span className="ticket-code">#{ticket.id}</span>
                        <span className="ticket-name-text" title={ticket.title}>{ticket.title}</span>
                      </div>
                      <span className="ticket-desc-text" title={ticket.description}>{ticket.description || 'No description added.'}</span>
                    </td>
                    
                    <td>
                      <span className={`saas-badge-tag priority-${ticket.priority.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                    </td>

                    <td>
                      <div className="status-select-container">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleQuickStatusChange(ticket, e.target.value as Ticket['status'])}
                          disabled={backendStatus === 'OFFLINE'}
                          className={`status-inline-select status-select-${ticket.status.toLowerCase()}`}
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                    </td>

                    <td className="col-date">
                      {formatDate(ticket.updatedAt)}
                    </td>

                    <td className="col-actions">
                      <div className="action-row-buttons">
                        <button 
                          onClick={() => handleOpenEdit(ticket)} 
                          className="action-icon-btn edit" 
                          title="Edit Incident"
                          disabled={backendStatus === 'OFFLINE'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => ticket.id && handleDelete(ticket.id)} 
                          className="action-icon-btn delete" 
                          title="Archive Incident"
                          disabled={backendStatus === 'OFFLINE'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  const renderMainBody = () => {
    if (selectedNavId === 'all-incidents') {
      return (
        <div className="bento-grid page-view">
          
          {/* Card 1: Primary KPIs Merged */}
          <div className="bento-card col-span-4 highlight-blue kpi-merged-card">
            <div className="kpi-decor"></div>
            <div className="kpi-merged-row">
              <div className="kpi-item">
                <span className="kpi-title">Total Incidents</span>
                <h3 className="kpi-number">{stats.total}</h3>
              </div>
              <div className="kpi-divider"></div>
              <div className="kpi-item">
                <span className="kpi-title">Unresolved / Open</span>
                <h3 className="kpi-number">{stats.statusCounts.OPEN}</h3>
              </div>
            </div>
            <div className="kpi-progress-bar-container">
              <div className="kpi-progress-label">Active Backlog Ratio</div>
              <div className="kpi-progress-track">
                <div 
                  className="kpi-progress-fill" 
                  style={{ width: `${stats.total === 0 ? 0 : (stats.statusCounts.OPEN / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 2: Activity Feed Logs (Vertically Merged) */}
          <div className="bento-card col-span-4 row-span-2 bento-logs-card">
            <h4 className="widget-title">Activity Feed</h4>
            <p className="widget-desc">Real-time gateway event logs</p>
            <div className="log-items">
              {activities.map((act) => (
                <div key={act.id} className={`log-item log-${act.type}`}>
                  <span className="log-dot"></span>
                  <p className="log-text">{act.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Resolution Ratio Donut (Vertically Merged Gradient Card) */}
          <div className="bento-card col-span-4 row-span-2 card-gradient bento-donut-card">
            <h4 className="widget-title text-white">Resolution Ratio</h4>
            <div className="resolution-circle-wrapper">
              <svg width="100" height="100" viewBox="0 0 36 36" className="donut-chart-svg">
                <path
                  className="donut-ring"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3.5"
                />
                <path
                  className="donut-segment"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray={
                    stats.total === 0 
                      ? '0, 100' 
                      : `${((stats.statusCounts.RESOLVED + stats.statusCounts.CLOSED) / stats.total) * 100}, 100`
                  }
                />
              </svg>
              <div className="donut-center-text">
                <span>
                  {stats.total === 0 
                    ? '0%' 
                    : `${Math.round(((stats.statusCounts.RESOLVED + stats.statusCounts.CLOSED) / stats.total) * 100)}%`
                  }
                </span>
                <label>Done</label>
              </div>
            </div>
            <p className="resolution-helper-text">Ratio of completed tickets relative to incoming backlog.</p>
          </div>

          {/* Card 4: Secondary KPIs Merged */}
          <div className="bento-card col-span-4 highlight-teal kpi-merged-card">
            <div className="kpi-decor"></div>
            <div className="kpi-merged-row">
              <div className="kpi-item">
                <span className="kpi-title">In Progress</span>
                <h3 className="kpi-number">{stats.statusCounts.IN_PROGRESS}</h3>
              </div>
              <div className="kpi-divider"></div>
              <div className="kpi-item">
                <span className="kpi-title">Resolved & Closed</span>
                <h3 className="kpi-number">{stats.statusCounts.RESOLVED + stats.statusCounts.CLOSED}</h3>
              </div>
            </div>
            <div className="kpi-progress-bar-container">
              <div className="kpi-progress-label">Recovery Resolution Rate</div>
              <div className="kpi-progress-track">
                <div 
                  className="kpi-progress-fill" 
                  style={{ width: `${stats.total === 0 ? 0 : ((stats.statusCounts.RESOLVED + stats.statusCounts.CLOSED) / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 5: Incidents Registry Table (Large horizontal space) */}
          <div className="bento-card col-span-8 bento-table-card">
            {renderIncidentsTable()}
          </div>

          {/* Card 6: Priority Level Chart Widget */}
          <div className="bento-card col-span-4 bento-chart-card">
            <h4 className="widget-title">Urgency Metrics</h4>
            <p className="widget-desc">Incident breakdown by priority levels</p>
            <div className="chart-container-saas">
              {stats.total === 0 ? (
                <div className="empty-chart">No data available</div>
              ) : (
                <div className="svg-bars-chart">
                  <div className="bar-row">
                    <div className="bar-labels">
                      <span>Low</span>
                      <span>{stats.priorityCounts.LOW}</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill bg-low" 
                        style={{ width: `${(stats.priorityCounts.LOW / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-labels">
                      <span>Medium</span>
                      <span>{stats.priorityCounts.MEDIUM}</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill bg-medium" 
                        style={{ width: `${(stats.priorityCounts.MEDIUM / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bar-row">
                    <div className="bar-labels">
                      <span>High</span>
                      <span>{stats.priorityCounts.HIGH}</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill bg-high" 
                        style={{ width: `${(stats.priorityCounts.HIGH / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      );
    }

    if (['unresolved-incidents', 'working-incidents', 'critical-incidents', 'resolved-incidents'].includes(selectedNavId)) {
      return (
        <div className="page-view incidents-page-view">
          <div className="page-header-card">
            <h2 className="page-title-text">
              {selectedNavId === 'unresolved-incidents' ? 'Unresolved Open Incidents' :
               selectedNavId === 'working-incidents' ? 'Active Working Incidents' :
               selectedNavId === 'critical-incidents' ? 'Critical Urgency Incidents' :
               'Resolved Incident History'}
            </h2>
            <p className="page-desc-text">
              Dedicated worklist view for managing {selectedNavId.replace('-incidents', '')} incident records.
            </p>
          </div>

          <div className="page-content-wrapper">
            <div className="bento-grid">
              <div className="bento-card col-span-4 highlight-blue kpi-merged-card mini-stats-card">
                <span className="kpi-title">Active Filter Total</span>
                <h3 className="kpi-number">{filteredTickets.length}</h3>
              </div>
              <div className="bento-card col-span-4 highlight-teal kpi-merged-card mini-stats-card">
                <span className="kpi-title">System Status</span>
                <h3 className="kpi-number" style={{ color: 'var(--accent-secondary)' }}>
                  {backendStatus === 'ONLINE' ? 'Synced' : 'Offline'}
                </h3>
              </div>
              <div className="bento-card col-span-4 highlight-rose kpi-merged-card mini-stats-card">
                <span className="kpi-title">Backlog Ratio</span>
                <h3 className="kpi-number">
                  {stats.total === 0 ? '0%' : `${Math.round((filteredTickets.length / stats.total) * 100)}%`}
                </h3>
              </div>

              <div className="bento-card col-span-12 bento-table-card full-width-table-card">
                {renderIncidentsTable()}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (['dept-eng', 'dept-prod', 'dept-sec'].includes(selectedNavId)) {
      return (
        <div className="page-view dept-page-view">
          <div className="page-header-card dept-card">
            <div className="dept-banner-icon">
              <Icon name={selectedNavId === 'dept-eng' ? 'engineering' : selectedNavId === 'dept-prod' ? 'product' : 'security'} className="dept-icon-svg" />
            </div>
            <div className="dept-banner-info">
              <h2 className="page-title-text">
                {selectedNavId === 'dept-eng' ? 'Engineering Support Portal' :
                 selectedNavId === 'dept-prod' ? 'Product Experience Portal' :
                 'Security Operations Hub'}
              </h2>
              <p className="page-desc-text">
                {selectedNavId === 'dept-eng' ? 'Core development support, database queries, and system bug tracking environment.' :
                 selectedNavId === 'dept-prod' ? 'UX enhancements, front-end visual fixes, and user experience issues portal.' :
                 'Authentication breaches, firewall leaks, and permission access requests monitoring console.'}
              </p>
            </div>
          </div>

          <div className="bento-grid">
            <div className="bento-card col-span-4 highlight-violet kpi-merged-card mini-stats-card">
              <span className="kpi-title">Department Open Issues</span>
              <h3 className="kpi-number">{filteredTickets.length}</h3>
            </div>
            <div className="bento-card col-span-8 bento-logs-card dept-info-card">
              <h4 className="widget-title">Active Engineers Assigned</h4>
              <p className="widget-desc">On-call rotation staffing schedule</p>
              <div className="staffing-rotation">
                <span className="staff-chip">Alice Smith (On-Call)</span>
                <span className="staff-chip">Bob Johnson</span>
                <span className="staff-chip">Charlie Brown</span>
              </div>
            </div>

            <div className="bento-card col-span-12 bento-table-card full-width-table-card">
              {renderIncidentsTable()}
            </div>
          </div>
        </div>
      );
    }

    if (['workspace-settings', 'api-console'].includes(selectedNavId)) {
      return (
        <div className="page-view settings-page-view">
          <div className="page-header-card">
            <h2 className="page-title-text">Workspace Control Center</h2>
            <p className="page-desc-text">Manage integration settings, actuator telemetry, and preferences.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card col-span-6 settings-info-card">
              <h4 className="widget-title">Workspace Details</h4>
              <div className="settings-fields-static">
                <div className="static-field">
                  <label>Label</label>
                  <span>{workspaceName}</span>
                </div>
                <div className="static-field">
                  <label>Default Priority</label>
                  <span>{defaultPriority}</span>
                </div>
                <div className="static-field">
                  <label>Auto-Sync Interval</label>
                  <span>{autoSyncInterval}</span>
                </div>
              </div>
              <button className="action-btn-primary" onClick={() => setPrefModalOpen(true)} style={{ marginTop: '16px' }}>
                Open Preferences
              </button>
            </div>

            <div className="bento-card col-span-6 telemetry-card">
              <h4 className="widget-title">System Telemetry (Actuator)</h4>
              <p className="widget-desc">Raw JVM and environment states</p>
              <div className="telemetry-grid">
                <div className="tel-item">
                  <span className="tel-label">Uptime</span>
                  <span className="tel-val">99.98%</span>
                </div>
                <div className="tel-item">
                  <span className="tel-label">JVM Heap</span>
                  <span className="tel-val">124MB / 512MB</span>
                </div>
                <div className="tel-item">
                  <span className="tel-label">Active Connections</span>
                  <span className="tel-val">4</span>
                </div>
                <div className="tel-item">
                  <span className="tel-label">DB Engine</span>
                  <span className="tel-val">H2 (In-Memory)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`saas-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileDrawerOpen ? 'mobile-drawer-open' : ''} ${isDarkMode ? 'dark-theme' : ''}`}>
      {globalLoading && (
        <div className="global-ticket-loader">
          <div className="ticket-3d-wrapper">
            <div className="ticket-3d">
              <div className="ticket-front">
                <div className="ticket-stub">
                  <div className="ticket-logo">TD</div>
                  <div className="ticket-stub-num">#0806</div>
                </div>
                <div className="ticket-divider"></div>
                <div className="ticket-main">
                  <div className="ticket-title">TICKETDESK</div>
                  <div className="ticket-subtitle">INCIDENT GATEWAY</div>
                  <div className="ticket-status-pill">INITIALIZING...</div>
                  <div className="ticket-barcode">
                    <span></span><span></span><span></span><span></span><span></span>
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="loader-progress-text">Authenticating gateway connection...</div>
        </div>
      )}

      {/* 3D floating scroll-parallax glass blobs */}
      <div className="parallax-bg-blobs">
        <div 
          className="blob blob-1" 
          style={{ transform: `translate3d(${mousePos.x * 24}px, ${mousePos.y * 24 - scrollY * 0.12}px, 0)` }}
        ></div>
        <div 
          className="blob blob-2" 
          style={{ transform: `translate3d(${mousePos.x * -36}px, ${mousePos.y * -36 - scrollY * 0.28}px, 0)` }}
        ></div>
        <div 
          className="blob blob-3" 
          style={{ transform: `translate3d(${mousePos.x * 16}px, ${mousePos.y * 16 - scrollY * 0.08}px, 0)` }}
        ></div>
      </div>

      {/* Mobile Backdrop overlay */}
      {isMobileDrawerOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobileDrawerOpen(false)}></div>
      )}

      {/* Offline Alert */}
      {backendStatus === 'OFFLINE' && (
        <div className="offline-banner" id="backend-offline-banner">
          <div className="offline-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
            <span>Gateway offline. Using offline interface.</span>
            <button className="retry-btn" onClick={fetchData}>Reconnect</button>
          </div>
        </div>
      )}

      <aside 
        className="saas-sidebar"
        style={{
          transform: `perspective(1200px) rotateY(${mousePos.x * 3}deg) rotateX(${-mousePos.y * 3}deg) translateZ(30px)`,
        }}
      >
        
        {/* Fixed Header */}
        <div className="sidebar-header">
          <div className="brand-logo-group">
            <div className="brand-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
            </div>
            <div className="brand-label-container">
              <span className="brand-name">TicketDesk</span>
              <span className="brand-workspace">{workspaceName}</span>
            </div>
          </div>
          
          <button 
            className="sidebar-toggle-btn" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isSidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"/>
              ) : (
                <polyline points="15 18 9 12 15 6"/>
              )}
            </svg>
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <nav className="sidebar-scrollable-body">
          {navConfig.map((group) => {
            const hasChildren = group.children && group.children.length > 0;
            const isExpanded = expandedAccordions[group.id] || false;

            return (
              <div key={group.id} className="nav-group-node">
                {/* Accordion Trigger */}
                <button 
                  className="nav-group-trigger" 
                  onClick={() => toggleAccordion(group.id)}
                >
                  <div className="trigger-left">
                    <Icon name={group.icon} className="nav-icon" />
                    <span className="nav-label">{group.label}</span>
                  </div>
                  <Icon 
                    name="chevron" 
                    className={`nav-chevron ${isExpanded ? 'open' : ''} nav-label`} 
                  />
                  {/* Collapsed Tooltip */}
                  {isSidebarCollapsed && (
                    <span className="collapsed-tooltip">{group.label}</span>
                  )}
                </button>

                {/* Sub Menu list */}
                {hasChildren && (
                  <div className={`accordion-panel ${isExpanded ? 'expanded' : ''}`}>
                    <div className="nav-sub-list">
                      {group.children?.map((item, itemIndex) => {
                        const isActive = selectedNavId === item.id;
                        return (
                          <div key={item.id} className="nav-item-wrapper">
                            {!isSidebarCollapsed && (
                              <svg className="tree-connector-svg" width="24" height="36" viewBox="0 0 24 36" fill="none">
                                <path
                                  d={itemIndex === group.children!.length - 1 
                                    ? "M 10 0 L 10 16 Q 10 24 24 24" 
                                    : "M 10 0 L 10 36 M 10 16 Q 10 24 24 24"
                                  }
                                  stroke="rgba(255, 255, 255, 0.12)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                            <button
                              className={`nav-sub-item-btn ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedNavId(item.id);
                                if (item.action) item.action();
                                setIsMobileDrawerOpen(false); // Close on click for mobile
                              }}
                            >
                              <Icon name={item.icon} className="sub-nav-icon" />
                              <span className="nav-label">{item.label}</span>
                              {item.badge !== undefined && (
                                <span className={`nav-badge nav-label ${isActive ? 'badge-active' : ''}`}>{item.badge}</span>
                              )}
                            </button>
                            
                            {/* Collapsed Tooltip for nested item */}
                            {isSidebarCollapsed && (
                              <span className="collapsed-tooltip">
                                {item.label} {item.badge !== undefined ? `(${item.badge})` : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pinned Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-section">
            <div className="profile-avatar">
              <span className="avatar-text">JD</span>
            </div>
            <div className="user-info nav-label">
              <span className="user-name">John Doe</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
          
          <button 
            className="footer-action-btn" 
            onClick={() => setPrefModalOpen(true)}
            title="Workspace Preferences"
          >
            <Icon name="settings" className="footer-icon" />
            {isSidebarCollapsed && (
              <span className="collapsed-tooltip">Preferences</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Dashboard Card (White Card, 30px radius) */}
      <main className="saas-main-card">
        {/* Top Toolbar */}
        <header className="main-toolbar">
          <div className="toolbar-search">
            {/* Mobile Drawer Trigger Menu Button */}
            <button 
              className="mobile-menu-trigger" 
              onClick={() => setIsMobileDrawerOpen(true)}
              title="Open Navigation"
            >
              <Icon name="collapse" />
            </button>

            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search incidents by keywords..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="search-bar"
              id="search-input"
            />
          </div>

          <div className="toolbar-actions">
            <div className={`status-badge-saas ${backendStatus.toLowerCase()}`}>
              <span className="dot"></span>
              {backendStatus === 'ONLINE' ? 'Gateway Online' : 'Gateway Offline'}
            </div>
            
            <button 
              className="theme-toggle-btn" 
              onClick={(e) => toggleTheme(e, !isDarkMode)}
              title="Toggle Theme"
              id="theme-toggler"
            >
              <Icon name={isDarkMode ? 'sun' : 'moon'} className="theme-toggle-icon" />
            </button>
            
            <button 
              className="action-btn-primary" 
              onClick={handleOpenCreate}
              disabled={backendStatus === 'OFFLINE'}
              id="btn-create-ticket"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Incident
            </button>
          </div>
        </header>

        {renderMainBody()}
      </main>

      {/* Modal - Create/Edit Ticket */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content-saas" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header-saas">
              <h2 className="modal-title-saas">
                {editingTicket ? `Modify Incident Details` : 'Register New Incident'}
              </h2>
              <button className="modal-close-saas" onClick={() => setModalOpen(false)}>
                &times;
              </button>
            </header>

            <form onSubmit={handleSubmit} className="modal-form-saas">
              {formError && <div className="form-error-saas">{formError}</div>}
              
              <div className="form-group-saas">
                <label className="form-label-saas" htmlFor="ticket-title">Incident Title</label>
                <input 
                  type="text" 
                  id="ticket-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Critical database connection bottleneck"
                  className="form-input-saas"
                  required
                />
              </div>

              <div className="form-group-saas">
                <label className="form-label-saas" htmlFor="ticket-desc">Context & Description</label>
                <textarea 
                  id="ticket-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide steps to reproduce or diagnostics detail..."
                  className="form-textarea-saas"
                  rows={4}
                />
              </div>

              <div className="form-row-saas">
                <div className="form-group-saas half">
                  <label className="form-label-saas" htmlFor="ticket-status">Status state</label>
                  <select 
                    id="ticket-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Ticket['status'])}
                    className="form-select-saas"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div className="form-group-saas half">
                  <label className="form-label-saas" htmlFor="ticket-priority">Priority urgency</label>
                  <select 
                    id="ticket-priority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Ticket['priority'])}
                    className="form-select-saas"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <footer className="modal-footer-saas">
                <button type="button" className="btn-saas-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-saas-primary" id="btn-submit-ticket">
                  {editingTicket ? 'Save Incident' : 'File Incident'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Preferences Modal - Workspace & General Settings */}
      {prefModalOpen && (
        <div className="modal-overlay" onClick={() => setPrefModalOpen(false)}>
          <div className="modal-content-saas settings-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header-saas">
              <h2 className="modal-title-saas">Workspace Preferences</h2>
              <button className="modal-close-saas" onClick={() => setPrefModalOpen(false)}>
                &times;
              </button>
            </header>

            <div className="modal-form-saas">
              <div className="form-group-saas">
                <label className="form-label-saas" htmlFor="workspace-name-input">Workspace Label Name</label>
                <input 
                  type="text" 
                  id="workspace-name-input"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    localStorage.setItem('workspaceName', e.target.value);
                  }}
                  className="form-input-saas"
                  placeholder="e.g. Acme Ops"
                />
              </div>

              <div className="form-row-saas">
                <div className="form-group-saas half">
                  <label className="form-label-saas" htmlFor="default-priority-select">Default Ticket Priority</label>
                  <select 
                    id="default-priority-select"
                    value={defaultPriority}
                    onChange={(e) => {
                      const priority = e.target.value as Ticket['priority'];
                      setDefaultPriority(priority);
                      localStorage.setItem('defaultPriority', priority);
                    }}
                    className="form-select-saas"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="form-group-saas half">
                  <label className="form-label-saas" htmlFor="auto-sync-select">Auto-Sync Poll Interval</label>
                  <select 
                    id="auto-sync-select"
                    value={autoSyncInterval}
                    onChange={(e) => {
                      setAutoSyncInterval(e.target.value);
                      localStorage.setItem('autoSyncInterval', e.target.value);
                    }}
                    className="form-select-saas"
                  >
                    <option value="Off">Off</option>
                    <option value="10s">Every 10s</option>
                    <option value="30s">Every 30s</option>
                    <option value="1m">Every 1m</option>
                  </select>
                </div>
              </div>

              <div className="form-group-saas">
                <label className="form-label-saas">Interface Theme Style</label>
                <div className="theme-toggle-cards">
                  <button 
                    className={`theme-card-option light-opt ${!isDarkMode ? 'active' : ''}`}
                    onClick={(e) => toggleTheme(e, false)}
                  >
                    <span className="theme-dot light"></span>
                    <span>Light Slate</span>
                  </button>
                  <button 
                    className={`theme-card-option dark-opt ${isDarkMode ? 'active' : ''}`}
                    onClick={(e) => toggleTheme(e, true)}
                  >
                    <span className="theme-dot dark"></span>
                    <span>Hologram Dark</span>
                  </button>
                </div>
              </div>

              <footer className="modal-footer-saas">
                <button type="button" className="btn-saas-primary" onClick={() => setPrefModalOpen(false)}>
                  Apply Settings
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
