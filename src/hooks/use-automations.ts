"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AutomationRecord,
  AutomationRunRecord,
  CreateAutomationInput,
  UpdateAutomationInput,
} from "@/types/automations";

export const AUTOMATIONS_KEY = "automations";
export const AUTOMATION_RUNS_KEY = "automation_runs";

export function useAutomations() {
  return useQuery<AutomationRecord[]>({
    queryKey: [AUTOMATIONS_KEY],
    queryFn: async () => {
      const res = await fetch("/api/automations");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to fetch automations");
      }
      const data = await res.json();
      return data.automations || [];
    },
    staleTime: 10 * 1000,
  });
}

export function useAutomation(id?: string) {
  return useQuery<{
    automation: AutomationRecord;
    recentRuns: AutomationRunRecord[];
  }>({
    queryKey: [AUTOMATIONS_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error("Automation ID required");
      const res = await fetch(`/api/automations/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to fetch automation");
      }
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useAutomationRuns(id?: string) {
  return useQuery<AutomationRunRecord[]>({
    queryKey: [AUTOMATION_RUNS_KEY, id],
    queryFn: async () => {
      if (!id) return [];
      const res = await fetch(`/api/automations/${id}/runs`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to fetch runs");
      }
      const data = await res.json();
      return data.runs || [];
    },
    enabled: Boolean(id),
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAutomationInput) => {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to create automation");
      }
      return data.automation as AutomationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateAutomationInput;
    }) => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to update automation");
      }
      return data.automation as AutomationRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY, variables.id] });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to delete automation");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
  });
}

export function usePauseAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}/pause`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to pause automation");
      }
      return data.automation as AutomationRecord;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY, id] });
    },
  });
}

export function useResumeAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}/resume`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to resume automation");
      }
      return data.automation as AutomationRecord;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY, id] });
    },
  });
}

export function useRunAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Manual run failed");
      }
      return data.run as AutomationRunRecord;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [AUTOMATION_RUNS_KEY, id] });
    },
  });
}
