// src/app/services/trackerService.ts
import { Job } from '../types/job';

// This points to the secure route you just built!
const API_URL = 'http://localhost:5000/api/tracker';

// Helper function to grab the VIP wristband (JWT token)
// (We check for 'window' to ensure Next.js doesn't crash during server-side rendering)
const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token'); // Assuming your auth team saves the token here
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }
  return { 'Content-Type': 'application/json' };
};

export const trackerService = {
  
  // 1. Fetch all jobs for the dashboard
  async getAllJobs(): Promise<Job[]> {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch jobs from Mirae backend');
    }

    return response.json();
  },

  // 2. Add a job manually (Optional, but great for dashboard users)
  async createJob(jobData: Partial<Job>): Promise<{ message: string; job: Job }> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      let errorPayload: any = null;
      try {
        errorPayload = await response.json();
      } catch {
        // Ignore parse failures and use fallback below.
      }
      const error: any = new Error(errorPayload?.error || 'Failed to save job to Mirae backend');
      error.code = errorPayload?.code;
      error.duplicate = errorPayload?.duplicate;
      throw error;
    }

    return response.json();
  }
};
