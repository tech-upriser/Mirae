import api from './api';

export interface ProfileData {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  is2FAEnabled?: boolean;
  resumeSkills?: string[];
}

interface ProfileResponse {
  message?: string;
  user: ProfileData;
  profilePhoto?: string;
}

export const profileService = {
  async getProfile(): Promise<ProfileData> {
    const { data } = await api.get<ProfileData>('/profile');
    return data;
  },

  async updateProfile(payload: { name: string; email: string }): Promise<ProfileData> {
    const { data } = await api.put<ProfileResponse>('/profile/update', payload);
    return data.user;
  },

  async uploadPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('photo', file);

    const { data } = await api.post<ProfileResponse>('/profile/upload-photo', formData);

    return data.profilePhoto || data.user.profilePhoto || '';
  },

  async deleteAccount(): Promise<string> {
    const { data } = await api.delete<{ message: string }>('/profile/delete');
    return data.message;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<string> {
    const { data } = await api.put<{ message: string }>('/profile/change-password', payload);
    return data.message;
  }
};
