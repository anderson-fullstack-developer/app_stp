import { useAuth } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_API } from "@/config/api";
import { accountService } from "@/services/account.service";

/**
 * Perfil do utilizador na API (GET /me). Só pede com sessão iniciada e com a API
 * configurada (VITE_API_URL); sem isso fica desligado e os ecrãs usam o Clerk.
 */
export function useAccountProfile() {
  const { isSignedIn, userId } = useAuth();
  const enabled = Boolean(isSignedIn) && !USE_MOCK_API;
  const query = useQuery({
    queryKey: ["account", userId],
    queryFn: accountService.getProfile,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  return { ...query, enabled };
}
