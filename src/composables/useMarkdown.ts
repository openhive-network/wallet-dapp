import { marked, type MarkedExtension } from 'marked';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

const customExtension: MarkedExtension = {
  renderer: {
    link ({ href, text }) {
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      if (isExternal)
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 keychainify-checked">${text}</a>`;

      return `<a href="${href}" class="text-primary underline hover:text-primary/80 keychainify-checked">${text}</a>`;
    }
  }
};

marked.use({
  gfm: true,
  breaks: false,
  ...customExtension
});

export function useMarkdown (content: MaybeRefOrGetter<string>) {
  const html = computed(() => {
    const rawContent = toValue(content);
    return marked.parse(rawContent) as string;
  });

  return { html };
}
