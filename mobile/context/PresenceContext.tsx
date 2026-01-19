import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuthState } from "@/hooks/useAuthState";

export type PresenceState = {
  user_id: string;
  online_at: string;
};

type PresenceContextType = {
  onlineUsers: Record<string, PresenceState>;
  isUserOnline: (userId: string) => boolean;
};

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined,
);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuthState();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>(
    {},
  );
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user?.id) return;

    // 1. Initialize Presence Channel
    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const trackPresence = async () => {
      if (appState.current === "active") {
        await channel.track({
          online_at: new Date().toISOString(),
        });

        // Update last_seen_at in DB
        await supabase
          .from("users")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    };

    // 2. Setup Listeners
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const formatted: Record<string, PresenceState> = {};

        Object.keys(state).forEach((key) => {
          const presence = state[key][0] as any;
          formatted[key] = {
            user_id: key,
            online_at: presence.online_at,
          };
        });

        setOnlineUsers(formatted);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackPresence();
        }
      });

    // 3. Monitor App State (Foreground/Background)
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
      if (nextAppState === "active") {
        await trackPresence();
      } else {
        // When leaving, untrack
        await channel.untrack();
        // Update last_seen_at one last time
        await supabase
          .from("users")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // 4. Heartbeat to update last_seen_at occasionally while active
    const heartbeat = setInterval(
      async () => {
        if (appState.current === "active") {
          await supabase
            .from("users")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", user.id);
        }
      },
      1000 * 60 * 2,
    );

    return () => {
      subscription.remove();
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isUserOnline = (userId: string) => {
    return !!onlineUsers[userId];
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error(
      "usePresenceContext must be used within a PresenceProvider",
    );
  }
  return context;
};
