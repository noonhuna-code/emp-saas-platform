import type { ServiceContext } from "@emp/lib/types";
import { buildAuthContext } from "./auth";
import { getRequestId } from "./request-id";

export const buildServiceContext = async (requestId?: string): Promise<ServiceContext> => {
  const auth = await buildAuthContext();

  return {
    ...auth,
    requestId: requestId ?? getRequestId()
    // TODO: Wire a real transaction adapter if/when frontend triggers transactional service methods.
  };
};
