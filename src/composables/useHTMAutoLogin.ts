import { ref, computed } from 'vue';

/**
 * Composable for HTM auto-login functionality
 * Handles password encryption toggle and auto-login password generation
 */
export const useHTMAutoLogin = () => {
  const encryptKeys = ref(true);
  const password = ref('');
  const repeatPassword = ref('');

  // Show warning when encryption is disabled
  const showEncryptionWarning = computed(() => !encryptKeys.value);

  // Check if passwords match
  const passwordsMatch = computed(() => {
    if (!encryptKeys.value) return true;
    if (!password.value || !repeatPassword.value) return true;
    return password.value === repeatPassword.value;
  });

  // Check if password fields are valid
  const isPasswordValid = computed(() => {
    if (!encryptKeys.value) return true;
    return password.value.trim().length > 0 &&
           repeatPassword.value.trim().length > 0 &&
           passwordsMatch.value;
  });

  // Generate a random password when encryption is disabled
  const generateRandomPassword = (): string => {
    const randomPart1 = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    const randomPart3 = Date.now().toString(36);
    return `${randomPart1}${randomPart2}${randomPart3}`;
  };

  // Get the password to use (either user-provided or random)
  const getPasswordToUse = (): string => {
    if (encryptKeys.value) {
      localStorage.removeItem('htm_random_password');

      return password.value;
    }

    // Generate random password and store in localStorage (client-side only)
    const randomPassword = generateRandomPassword();

    // Safe localStorage access for SSR
    localStorage.setItem('htm_random_password', randomPassword);

    return randomPassword;
  };

  return {
    encryptKeys,
    password,
    repeatPassword,
    showEncryptionWarning,
    passwordsMatch,
    isPasswordValid,
    getPasswordToUse
  };
};
