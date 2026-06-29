const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export async function getAnalyticsOverview(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/overview?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics overview');
  }

  return response.json();
}

export async function getTrends(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/trends?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch trends');
  }

  return response.json();
}



export async function getSkillGapAnalysis(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/skill-gap?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill gap analysis');
  }

  return response.json();
}

export async function getMatchInsights(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/match-insights?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch match insights');
  }

  return response.json();
}

export async function getFunnel(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/funnel?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch funnel');
  return response.json();
}

export async function getResponseTimes(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/response-times?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch response times');
  return response.json();
}

export async function getCompanyBreakdown(category = 'Jobs') {
  const response = await fetch(`${API_BASE}/analytics/company-breakdown?category=${encodeURIComponent(category)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch company breakdown');
  return response.json();
}
