<script lang="ts" setup>
import { mdiLink } from '@mdi/js';
import { Globe, KeyRound, Rocket, WalletMinimal, UserCheck, SendToBack } from 'lucide-vue-next';
import { ref } from 'vue';

import step1Image from '@/assets/guides/authorization/step1.png';
import step2Image from '@/assets/guides/authorization/step2.png';
import step3Image from '@/assets/guides/authorization/step3.png';
import step4Image from '@/assets/guides/authorization/step4.png';
import step5Image from '@/assets/guides/authorization/step5.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const step = ref(0);
</script>

<template>
  <Card class="rounded-lg shadow border w-full max-w-[500px]">
    <CardHeader>
      <CardTitle class="pb-2 inline-flex items-center justify-between">
        <span>Authorize your dApp!</span>
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        ><path
          style="fill: hsla(var(--foreground) / 80%)"
          :d="mdiLink"
        /></svg>
      </CardTitle>
      <CardDescription>
        Thanks to this module, you can easily authorize to the dApps on the Hive platform.
        You won't have to provide your keys, or be redirected to a third-party site.
      </CardDescription>
    </CardHeader>
    <CardContent class="flex-1 flex flex-col justify-between">
      <div
        v-if="step === 0"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <Globe
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 1: Find a dApp
            </h3>
            <p class="text-sm text-muted-foreground">
              Browse the
              <a
                class="text-blue-500 hover:underline"
                href="https://hive.io/eco"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hive dApp ecosystem
              </a>
              and find a dApp you want to use or just explore
              <a
                class="text-blue-500 hover:underline"
                href="https://hive.blog/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hive communities
              </a> for niche apps & games.
            </p>
          </div>
        </div>
        <div class="flex justify-end mt-2">
          <Button
            variant="default"
            class="mt-2"
            @click="step = 1"
          >
            Next
          </Button>
        </div>
      </div>
      <div
        v-else-if="step === 1"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <Rocket
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 2: Start using dApp
            </h3>
            <p class="text-sm text-muted-foreground">
              When you find a dApp you want to use, it will ask for your authorization.
              Simply review the permissions and follow the link or button to authorize.
            </p>
            <div class="flex justify-center">
              <img
                :src="step1Image"
                class="border rounded mt-4 p-1"
                alt="Authorize Example"
              >
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-2">
          <Button
            variant="secondary"
            class="mt-2"
            @click="step = 0"
          >
            Back
          </Button>
          <Button
            variant="default"
            class="mt-2"
            @click="step = 2"
          >
            Next
          </Button>
        </div>
      </div>
      <div
        v-else-if="step === 2"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <KeyRound
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 3: Authorize the dApp
            </h3>
            <p class="text-sm text-muted-foreground">
              After successfully navigating to the authorization page on the Hive Bridge,
              review the dApp information and permissions. There will be plenty of data
              available to help you make an informed decision.
            </p>
            <div class="flex justify-center">
              <img
                :src="step2Image"
                class="border rounded mt-4 p-1"
                alt="Authorize View"
              >
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-2">
          <Button
            variant="secondary"
            class="mt-2"
            @click="step = 1"
          >
            Back
          </Button>
          <Button
            variant="default"
            class="mt-2"
            @click="step = 3"
          >
            Next
          </Button>
        </div>
      </div>
      <div
        v-else-if="step === 3"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <WalletMinimal
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 4: Review operation details
            </h3>
            <p class="text-sm text-muted-foreground">
              You will be prompted to review and sign the authorization operation
              using the wallet you are currently logged in with. This won't require
              you to provide your keys, as the wallet will handle the signing process
              securely.
            </p>
            <div class="flex justify-center">
              <img
                :src="step3Image"
                class="w-[300px] mt-4 p-1 border rounded"
                alt="Confirm Operation"
              >
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-2">
          <Button
            variant="secondary"
            class="mt-2"
            @click="step = 2"
          >
            Back
          </Button>
          <Button
            variant="default"
            class="mt-2"
            @click="step = 4"
          >
            Next
          </Button>
        </div>
      </div>
      <div
        v-else-if="step === 4"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <UserCheck
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 5: Success!
            </h3>
            <p class="text-sm text-muted-foreground">
              Once you authorize the dApp, you will see a confirmation message.
              You can now return to the dApp and start using it with your authorized account.
            </p>
            <div class="flex justify-center">
              <img
                :src="step4Image"
                class="border rounded mt-4 p-1"
                alt="Success window"
              >
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-2">
          <Button
            variant="secondary"
            class="mt-2"
            @click="step = 3"
          >
            Back
          </Button>
          <Button
            variant="default"
            class="mt-2"
            @click="step = 5"
          >
            Next
          </Button>
        </div>
      </div>
      <div
        v-else-if="step === 5"
        class="space-y-6"
      >
        <div class="flex items-begin space-x-4">
          <SendToBack
            :size="50"
            class="text-muted-foreground"
          />
          <div>
            <h3 class="text-lg font-medium">
              Step 6: Go back to your dApp
            </h3>
            <p class="text-sm text-muted-foreground">
              After authorizing, return to the dApp you were using.
              You should now have access to all the features that require authorization.
              Enjoy exploring and using the dApp with your Hive account!
            </p>
            <div class="flex justify-center">
              <img
                :src="step5Image"
                class="border rounded mt-4 p-1"
                alt="dApp state after authorization"
              >
            </div>
          </div>
        </div>
        <div class="flex justify-start mt-2">
          <Button
            variant="secondary"
            class="mt-2"
            @click="step = 4"
          >
            Back
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
