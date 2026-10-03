import apiClient from './apiClient';

/**
 * Responsibility: Authentication API wrapper.
 * Interface strictly follows the B2B Backend contract.
 */
const authService = {
  /**
   * Performs Login via Email/Password
   */
  login: async (payload: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  /**
   * Registers a new user account.
   * Tries common backend route variants for compatibility.
   */
  signup: async (payload: {
    full_name: string;
    email: string;
    mobile: string;
    company_name: string;
    role: 'manufacturer' | 'distributor' | 'shop';
    password: string;
  }) => {
    try {
      const response = await apiClient.post('/auth/signup', payload);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const response = await apiClient.post('/auth/register', payload);
        return response.data;
      }
      throw error;
    }
  },

  /**
   * Requests a login OTP for the provided email.
   */
  requestOtp: async (email: string) => {
    const response = await apiClient.post('/auth/otp/request', { email });
    return response.data;
  },

  /**
   * Verifies the OTP and authenticates the user.
   */
  verifyOtp: async (payload: { email: string; otp: string }) => {
    const response = await apiClient.post('/auth/otp/verify', payload);
    return response.data;
  },

  /**
   * Triggers the forgot password email link.
   */
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Resets the password using a valid token.
   */
  resetPassword: async (payload: { token: string; new_password: string }) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },

  /**
   * Retrieves the current user's profile data.
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  /**
   * Updates the current user's profile data.
   */
  updateProfile: async (payload: any) => {
    const response = await apiClient.put('/auth/profile', payload);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.clear();
    }
  },

  /**
   * Authenticate using a Google OAuth idToken.
   */
  googleLogin: async (token: string, payload?: { role?: string, action?: 'signup' | 'login' }) => {
    const response = await apiClient.post('/auth/google', { access_token: token, ...payload });
    return response.data;
  },

  /**
   * Upload an image to the backend.
   */
  uploadImage: async (formData: FormData) => {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/uploads/image`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await response.json();
    return data;
  },

  /**
   * Upload a document to the backend.
   */
  uploadDocument: async (formData: FormData) => {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/uploads/document`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await response.json();
    return data;
  },

  /**
   * Retrieves the current user's KYB verification status.
   */
  getKybStatus: async () => {
    const response = await apiClient.get('/auth/kyb-status');
    return response.data;
  },

  /**
   * Submits KYB details for verification.
   */
  submitKyb: async (payload: {
    company_name: string;
    registration_number: string;
    tax_id: string;
    document_url: string;
    document_type?: string;
  }) => {
    const response = await apiClient.post('/auth/kyb-submit', payload);
    return response.data;
  }
};

export default authService;
