import { WaxChainApiError, WaxError } from "@hiveio/wax/vite";
import { toast } from "vue-sonner";

export const toastError = (title: string, error: unknown) => {
  let description: string;

  if (typeof error === "object" && error) {
    if (error instanceof WaxError) {
      if (error instanceof WaxChainApiError) {
        if (error.apiError
            && typeof error.apiError === "object"
            && "error" in error.apiError
            && typeof error.apiError.error === "object"
            && error.apiError.error
            && "message" in error.apiError.error
            && typeof error.apiError.error.message === "string")
          description = error.apiError.error.message;
        else
          description = error.message;
      } else {
        description = error.message;
      }
    } else if ("message" in error) {
      description = (error as Error).message;
    } else {
      description = String(error);
    }
  } else {
    description = String(error);
  }

  toast.error(title, { description });
};
