"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export interface ConnectionsResponse {
  gmail: {
    connected: boolean;
  };
  googlecalendar: {
    connected: boolean;
  };
}

export const CONNECTIONS_QUERY_KEY = ["corsair-connections"] as const;

async function fetchConnectionStatus(): Promise<ConnectionsResponse> {
  const res = await fetch("/api/corsair/connections");
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error(`Failed to fetch connections (Status: ${res.status})`);
  }
  return res.json();
}

export function useConnections() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ConnectionsResponse>({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: fetchConnectionStatus,
    staleTime: 60 * 1000, // 1 minute
  });

  const invalidateConnections = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
  }, [queryClient]);

  const isGmailConnected = Boolean(data?.gmail?.connected);
  const isCalendarConnected = Boolean(data?.googlecalendar?.connected);

  return {
    connections: data,
    isGmailConnected,
    isCalendarConnected,
    isLoading,
    isError,
    error,
    refetch,
    invalidateConnections,
  };
}
