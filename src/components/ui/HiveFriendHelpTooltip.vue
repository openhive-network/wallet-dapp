<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
</script>

<template>
  <TooltipProvider :delayDuration="200">
    <Tooltip>
      <TooltipTrigger class="flex items-center space-x-2 text-sm text-gray-400">
        <slot />
      </TooltipTrigger>
      <TooltipContent class="max-w-xs p-3" side="top">
        <div class="text-sm">
          <p class="font-semibold mb-2">Why do you need a Hive friend?</p>
          <div class="space-y-2 text-gray-700">
            <p>Creating a new Hive account requires an existing account holder to perform the transaction on the blockchain.</p>
            <p>This is because:</p>
            <ul class="list-disc ml-4 space-y-1">
              <li>Account creation costs a small fee</li>
              <li>It helps prevent spam and abuse</li>
              <li>It's part of Hive's decentralized onboarding process</li>
            </ul>
            <p class="mt-2">Your friend will use the link to sign the account creation transaction with your pre-generated public keys.</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>