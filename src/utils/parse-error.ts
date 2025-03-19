import { toast } from "vue-sonner";
import { useErrorDialogStore } from '@/stores/error-dialog.store';

export const toastError = (title: string, error: unknown) => {
  let description: string;

  if (typeof error === "object" && error && "message" in error) {
    if ("name" in error
        && error.name === "WaxChainApiError"
        && "apiError" in error
        && error.apiError
        && typeof error.apiError === "object"
        && "error" in error.apiError
        && typeof error.apiError.error === "object"
        && error.apiError.error
        && "message" in error.apiError.error
        && typeof error.apiError.error.message === "string")
      description = error.apiError.error.message as string;
    else
      description = error.message as string;
  } else
    description = String(error);

  toast.error(title, {
    description: description.length > 100 ? description.slice(0, 100) + "..." : description,
    duration: 8_000,
    action: {
      label: "Details",
      onClick: () => {
        const errorStore = useErrorDialogStore();

        errorStore.setError(title, error, description);
      }
    }
  });
};
