const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export async function getDashboardSummary() {
  const response = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }

  return response.json();
}

export async function getRecentJobs(
  sortBy: 'newest' | 'matchScore' = 'newest',
  search = ''
) {
  const query = new URLSearchParams({ sortBy });
  if (search.trim()) {
    query.set('search', search.trim());
  }

  const response = await fetch(`${API_BASE}/dashboard/recent?${query.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch recent jobs');
  }

  return response.json();
}

export async function deleteDashboardJob(jobId: string) {
  const response = await fetch(`${API_BASE}/tracker/${jobId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete job');
  }

  return response.json();
}

export async function updateJobStatus(jobId: string, status: string) {
  const response = await fetch(`${API_BASE}/tracker/${jobId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update job status');
  }

  return response.json();
}


export async function updateJobContacts(
  jobId: string,
  recruiterName: string,
  hiringManager: string
) {
  const response = await fetch(`${API_BASE}/tracker/${jobId}/contacts`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ recruiterName, hiringManager }),
  });

  if (!response.ok) {
    throw new Error('Failed to save contacts');
  }

  return response.json();
}

export async function updateJobNotes(jobId: string, notes: string) {
  const response = await fetch(`${API_BASE}/tracker/${jobId}/notes`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error('Failed to save note');
  }

  return response.json();
}
