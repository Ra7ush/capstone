import { useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * Custom hook to synchronize a React Query cache with Supabase Realtime changes.
 *
 * @param {string} table - The database table to monitor.
 * @param {string|string[]} queryKey - The React Query key(s) to invalidate on changes.
 * @param {string} schema - The database schema (defaults to 'public').
 */
export const useRealtimeSync = (table, queryKey, schema = "public") => {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  // Normalize queryKey to always be an array
  const queryKeys = useMemo(
    () => (Array.isArray(queryKey) ? queryKey : [queryKey]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Array.isArray(queryKey) ? queryKey.join(",") : queryKey]
  );

  // Store queryKeys in a ref so the callback always has the latest value
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;

  // Stable callback for handling changes
  const handleChange = useCallback(
    (payload) => {
      console.log(`[Realtime Sync] Change detected in ${table}:`, payload);

      // Refetch all query keys immediately
      queryKeysRef.current.forEach((key) => {
        console.log(`[Realtime Sync] Invalidating & refetching: ${key}`);
        queryClient.invalidateQueries({ queryKey: [key] });
        queryClient.refetchQueries({ queryKey: [key] });
      });
    },
    [table, queryClient]
  );

  useEffect(() => {
    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel name
    const channelName = `realtime-${table}-${queryKeys.join(
      "-"
    )}-${Date.now()}`;

    console.log(
      `[Realtime Sync] Establishing link for table: ${table} -> ${queryKeys.join(
        ", "
      )}`
    );

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: schema, table: table },
        handleChange
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime Sync] ✓ LINK ESTABLISHED for ${table}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime Sync] ✗ CHANNEL ERROR for ${table}:`, err);
        } else if (status === "TIMED_OUT") {
          console.error(`[Realtime Sync] ✗ TIMED OUT for ${table}`);
        } else if (status === "CLOSED") {
          console.log(`[Realtime Sync] Channel closed for ${table}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Realtime Sync] Terminating link for table: ${table}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, queryKeys, schema, handleChange]);
};
