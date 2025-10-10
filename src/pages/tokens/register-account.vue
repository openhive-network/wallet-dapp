<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import HTMLoginForm from '@/components/HTMLoginForm.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toastError } from '@/utils/parse-error';

const router = useRouter();
const showLoginForm = ref(false);
const showRegistrationForm = ref(false);
const isLoading = ref(false);

// Registration form data - following the same structure as userStore posting JSON metadata
const registrationData = ref({
  name: '',           // Account display name
  about: '',          // Description/bio
  website: '',        // Website URL
  profile_image: ''   // Profile image URL (for now, will be replaced with image hoster in future)
});

// Form validation
const isFormValid = computed(() => {
  return registrationData.value.name.trim().length > 0 &&
         registrationData.value.about.trim().length > 0;
});

// Show HTM login form
const showHTMLogin = () => {
  showLoginForm.value = true;
};

// Go back to main options
const goBack = () => {
  showLoginForm.value = false;
  showRegistrationForm.value = false;
  // Reset form data
  registrationData.value = {
    name: '',
    about: '',
    website: '',
    profile_image: ''
  };
};

// Handle successful login
const onLoginSuccess = () => {
  showLoginForm.value = false;
  // Redirect to my balance page after successful login
  router.push('/tokens/my-balance');
};

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Handle HTM account registration
const registerHTMAccount = async () => {
  try {
    isLoading.value = true;

    // Validate form data
    if (!isFormValid.value) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate website URL if provided
    if (registrationData.value.website && !isValidUrl(registrationData.value.website)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    // Validate profile image URL if provided
    if (registrationData.value.profile_image && !isValidUrl(registrationData.value.profile_image)) {
      toast.error('Please enter a valid profile image URL');
      return;
    }

    // Prepare metadata following the same structure as userStore posting JSON metadata
    const metadata = {
      profile: {
        name: registrationData.value.name.trim(),
        about: registrationData.value.about.trim(),
        website: registrationData.value.website.trim() || undefined,
        profile_image: registrationData.value.profile_image.trim() || undefined
      }
    };

    console.log('HTM Registration Data:', metadata);

    // TODO: Implement actual HTM account registration API call
    // This will need to integrate with the CTokens system
    // For now, show a detailed message about what would be registered
    toast.info('HTM Account registration prepared!', {
      description: `Registration data prepared for: ${metadata.profile.name}. API integration coming soon.`
    });

    // After successful registration, could redirect to login or automatically log in
    // For now, go back to main options
    goBack();

  } catch (error) {
    toastError('Failed to register HTM account', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container mx-auto py-12 px-4 max-w-2xl">
    <!-- Show HTM Login Form -->
    <div
      v-if="showLoginForm"
      class="flex justify-center"
    >
      <HTMLoginForm
        :show-close-button="true"
        title="HTM Login"
        description="Login to your existing HTM account or create a new one"
        @success="onLoginSuccess"
        @close="goBack"
      />
    </div>

    <!-- Show HTM Registration Form -->
    <Card
      v-else-if="showRegistrationForm"
      class="w-full"
    >
      <CardHeader>
        <CardTitle class="text-2xl">
          Register New HTM Account
        </CardTitle>
        <CardDescription>
          Create your HTM account profile. This information will be stored as metadata following the same structure as Hive posting JSON metadata.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <form
          class="space-y-4"
          @submit.prevent="registerHTMAccount"
        >
          <!-- Account Name (required) -->
          <div class="space-y-2">
            <Label for="account-name">
              Account Name *
            </Label>
            <Input
              id="account-name"
              v-model="registrationData.name"
              type="text"
              placeholder="Enter your display name"
              required
              maxlength="50"
            />
            <p class="text-xs text-muted-foreground">
              This will be your display name (max 50 characters)
            </p>
          </div>

          <!-- About/Description (required) -->
          <div class="space-y-2">
            <Label for="account-about">
              About *
            </Label>
            <Textarea
              id="account-about"
              v-model="registrationData.about"
              placeholder="Tell us about yourself or your project..."
              required
              rows="4"
              maxlength="500"
            />
            <p class="text-xs text-muted-foreground">
              Brief description about you or your project (max 500 characters)
            </p>
          </div>

          <!-- Website (optional) -->
          <div class="space-y-2">
            <Label for="account-website">
              Website
            </Label>
            <Input
              id="account-website"
              v-model="registrationData.website"
              type="url"
              placeholder="https://your-website.com"
            />
            <p class="text-xs text-muted-foreground">
              Your website or project URL (optional)
            </p>
          </div>

          <!-- Profile Image (optional) -->
          <div class="space-y-2">
            <Label for="account-profile-image">
              Profile Image URL
            </Label>
            <Input
              id="account-profile-image"
              v-model="registrationData.profile_image"
              type="url"
              placeholder="https://example.com/your-image.jpg"
            />
            <p class="text-xs text-muted-foreground">
              Profile image URL (optional) - in the future this will be handled by our image hosting service
            </p>
          </div>

          <!-- Form Actions -->
          <div class="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              @click="goBack"
            >
              Back
            </Button>
            <Button
              type="submit"
              :disabled="isLoading || !isFormValid"
              class="flex-1"
            >
              <span v-if="isLoading">Registering...</span>
              <span v-else>Register HTM Account</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Show main registration options -->
    <Card v-else>
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">
          Register HTM Account
        </CardTitle>
        <CardDescription>
          Create an account on the Hive Token Machine to manage your custom tokens
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="text-center space-y-4">
          <p class="text-sm text-muted-foreground">
            HTM accounts allow you to create, manage, and transfer custom tokens on the Hive blockchain.
            You can create a new HTM account or login to an existing one.
          </p>

          <!-- Registration options -->
          <div class="space-y-3">
            <Button
              size="lg"
              class="w-full"
              @click="showRegistrationForm = true"
            >
              Register New HTM Account
            </Button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              class="w-full"
              @click="showHTMLogin"
            >
              Login to Existing HTM Account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
