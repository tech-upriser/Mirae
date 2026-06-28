import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext'; // assuming AuthContext exists or we can just use token

export function useRealtimeUpdates(onUpdate: () => void) {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Decode token to get user ID (very basic decoding for JWT payload)
    const getUserId = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      } catch (e) {
        return null;
      }
    };

    const userId = getUserId();
    if (!userId) return;

    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('join', userId);
    });

    socket.on('status_update', (data: any) => {
      toast.success(`${data.company} application moved to ${data.newStatus}!`, {
        description: 'Auto-updated by Mirae Intelligence Engine',
        duration: 5000,
      });
      onUpdate();
    });

    return () => {
      socket.disconnect();
    };
  }, [onUpdate]);
}
