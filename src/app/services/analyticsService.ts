const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export async function getAnalyticsOverview() {
  const response = await fetch(`${API_BASE}/analytics/overview`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics overview');
  }

  return response.json();
}

export async function getTrends() {
  const response = await fetch(`${API_BASE}/analytics/trends`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch trends');
  }

  return response.json();
}



export async function getSkillGapAnalysis() {
  const response = await fetch(`${API_BASE}/analytics/skill-gap`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill gap analysis');
  }

  return response.json();
}

export async function getMatchInsights() {
  const response = await fetch(`${API_BASE}/analytics/match-insights`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch match insights');
  }

  return response.json();
}

export async function getFunnel() {
  const response = await fetch(`${API_BASE}/analytics/funnel`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch funnel');
  return response.json();
}

export async function getResponseTimes() {
  const response = await fetch(`${API_BASE}/analytics/response-times`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch response times');
  return response.json();
}

export async function getCompanyBreakdown() {
  const response = await fetch(`${API_BASE}/analytics/company-breakdown`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch company breakdown');
  return response.json();
}
