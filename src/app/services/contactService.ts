const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export async function getContacts() {
  const response = await fetch(`${API_BASE}/contacts`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch contacts');
  return response.json();
}

export async function getContactById(id: string) {
  const response = await fetch(`${API_BASE}/contacts/${id}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch contact');
  return response.json();
}

export async function updateContact(id: string, updates: any) {
  const response = await fetch(`${API_BASE}/contacts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update contact');
  return response.json();
}
