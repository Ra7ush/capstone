import { useAuth } from "../context/AuthContext";

/**
 * Hook to access the global authentication state.
 * Refactored to use AuthContext to ensure state synchronization across all components.
 */
export const useAuthState = useAuth;
