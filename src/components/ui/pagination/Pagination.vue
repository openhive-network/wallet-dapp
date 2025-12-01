<script setup lang="ts">
import { computed } from 'vue';
import { mdiChevronLeft, mdiChevronRight, mdiChevronDoubleLeft, mdiChevronDoubleRight } from '@mdi/js';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  maxVisiblePages?: number;
  loading?: boolean;
}

interface PaginationEmits {
  (e: 'update:currentPage', page: number): void;
  (e: 'pageChange', page: number): void;
}

const props = withDefaults(defineProps<PaginationProps>(), {
  maxVisiblePages: 5,
  loading: false
});

const emit = defineEmits<PaginationEmits>();

// Calculate which page numbers to display
const visiblePages = computed(() => {
  const { currentPage, totalPages, maxVisiblePages } = props;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfVisible = Math.floor(maxVisiblePages / 2);
  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, start + maxVisiblePages - 1);

  // Adjust start if we're near the end
  if (end - start < maxVisiblePages - 1) {
    start = Math.max(1, end - maxVisiblePages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const showFirstEllipsis = computed(() => {
  const pages = visiblePages.value;
  return pages.length > 0 && pages[0]! > 1;
});

const showLastEllipsis = computed(() => {
  const pages = visiblePages.value;
  return pages.length > 0 && pages[pages.length - 1]! < props.totalPages;
});

const goToPage = (page: number) => {
  if (page < 1 || page > props.totalPages || page === props.currentPage || props.loading) {
    return;
  }

  emit('update:currentPage', page);
  emit('pageChange', page);
};

const goToFirst = () => goToPage(1);
const goToPrevious = () => goToPage(props.currentPage - 1);
const goToNext = () => goToPage(props.currentPage + 1);
const goToLast = () => goToPage(props.totalPages);
</script>

<template>
  <nav
    v-if="totalPages > 0"
    class="flex items-center justify-center gap-1"
    aria-label="Pagination"
  >
    <!-- First Page Button -->
    <Button
      variant="outline"
      size="icon"
      :disabled="currentPage === 1 || loading"
      @click="goToFirst"
      aria-label="Go to first page"
    >
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiChevronDoubleLeft"
        />
      </svg>
    </Button>

    <!-- Previous Page Button -->
    <Button
      variant="outline"
      size="icon"
      :disabled="currentPage === 1 || loading"
      @click="goToPrevious"
      aria-label="Go to previous page"
    >
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiChevronLeft"
        />
      </svg>
    </Button>

    <!-- First Ellipsis -->
    <span v-if="showFirstEllipsis" class="px-2 text-muted-foreground">
      ...
    </span>

    <!-- Page Numbers -->
    <Button
      v-for="page in visiblePages"
      :key="page"
      :variant="page === currentPage ? 'default' : 'outline'"
      size="icon"
      :disabled="loading"
      @click="goToPage(page)"
      :aria-label="`Go to page ${page}`"
      :aria-current="page === currentPage ? 'page' : undefined"
    >
      {{ page }}
    </Button>

    <!-- Last Ellipsis -->
    <span v-if="showLastEllipsis" class="px-2 text-muted-foreground">
      ...
    </span>

    <!-- Next Page Button -->
    <Button
      variant="outline"
      size="icon"
      :disabled="currentPage === totalPages || loading"
      @click="goToNext"
      aria-label="Go to next page"
    >
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiChevronRight"
        />
      </svg>
    </Button>

    <!-- Last Page Button -->
    <Button
      variant="outline"
      size="icon"
      :disabled="currentPage === totalPages || loading"
      @click="goToLast"
      aria-label="Go to last page"
    >
      <svg
        width="18"
        height="18"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          style="fill: currentColor"
          :d="mdiChevronDoubleRight"
        />
      </svg>
    </Button>
  </nav>
</template>
