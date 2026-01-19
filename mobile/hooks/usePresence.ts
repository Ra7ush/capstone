import { usePresenceContext } from "../context/PresenceContext";

export function usePresence() {
  const { onlineUsers, isUserOnline } = usePresenceContext();

  return {
    onlineUsers,
    isUserOnline,
  };
}
