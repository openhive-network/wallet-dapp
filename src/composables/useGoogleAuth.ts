import { toastError } from '@/utils/parse-error';

export const useGoogleAuth = () => {
  const getAuthStatus = () => {
    const accessToken = useCookie('google_access_token');
    const userCookie = useCookie('google_user');

    if (!accessToken.value) {
      return {
        authenticated: false,
        user: null
      };
    }

    let user = null;
    if (userCookie.value) {
      try {
        user = typeof userCookie.value === 'string'
          ? JSON.parse(userCookie.value)
          : userCookie.value;
      } catch (err) {
        toastError('Error parsing user cookie', err);
      }
    }

    return {
      authenticated: true,
      user
    };
  };

  return {
    getAuthStatus
  };
};
