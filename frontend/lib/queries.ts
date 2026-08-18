import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  CreateCampaignInput,
  CreateCampaignResult,
  EmailDetail,
  EmailRow,
  Folder,
  PaginatedResult,
  Sender,
  User,
} from "@/types/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<{ data: User }>("/api/auth/me")).data.data,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/api/auth/logout")).data,
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
    },
  });
}

export function useSenders() {
  return useQuery({
    queryKey: ["senders"],
    queryFn: async () => (await api.get<{ data: Sender[] }>("/api/senders")).data.data,
  });
}

export function useCreateEtherealSender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name?: string) =>
      (await api.post<{ data: Sender }>("/api/senders/ethereal", { name })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
    },
  });
}

export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ["email", id],
    queryFn: async () => (await api.get<{ data: EmailDetail }>(`/api/emails/${id}`)).data.data,
    enabled: id !== null,
  });
}

export interface UseEmailsParams {
  status: Folder;
  page: number;
  search?: string;
}

export function useEmails({ status, page, search }: UseEmailsParams) {
  return useQuery({
    queryKey: ["emails", status, page, search],
    queryFn: async () =>
      (
        await api.get<{ data: PaginatedResult<EmailRow> }>("/api/emails", {
          params: { status, page, limit: 25, search: search || undefined },
        })
      ).data.data,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) =>
      (await api.patch<{ data: EmailDetail }>(`/api/emails/${id}/star`, { starred })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useArchiveEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      (await api.patch<{ data: EmailDetail }>(`/api/emails/${id}/archive`, { archived })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useTrashEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) =>
      (await api.patch<{ data: EmailDetail }>(`/api/emails/${id}/trash`, { deleted })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function usePermanentlyDeleteEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/emails/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) =>
      (await api.post<{ data: CreateCampaignResult }>("/api/campaigns", input)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}
