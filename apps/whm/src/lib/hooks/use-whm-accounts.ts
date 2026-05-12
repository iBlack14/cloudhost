"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAccount,
  fetchAccounts,
  fetchDashboard,
  fetchPlans,
  impersonateAccount,
  resumeAccount,
  suspendAccount,
  deleteAccount,
  syncDiskUsage,
  resetAccountPassword,
  changeAccountPlan,
  createPlan,
  updatePlan,
  deletePlan
} from "../api";

import { whmCreateAccountSchema, type WhmCreateAccountInput } from "../schemas/whm-create-account";

export const useWhmDashboard = () => {
  return useQuery({
    queryKey: ["whm-dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 15000
  });
};

export const useWhmPlans = () => {
  return useQuery({
    queryKey: ["whm-plans"],
    queryFn: fetchPlans
  });
};

export const useWhmAccounts = () => {
  return useQuery({
    queryKey: ["whm-accounts"],
    queryFn: fetchAccounts
  });
};

export const useCreateWhmAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WhmCreateAccountInput) => {
      const parsed = whmCreateAccountSchema.parse(input);
      return createAccount(parsed);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useSuspendWhmAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suspendAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useResumeWhmAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useImpersonateWhmAccount = () => {
  return useMutation({
    mutationFn: impersonateAccount
  });
};

export const useDeleteWhmAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useSyncWhmDiskUsage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncDiskUsage,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useResetWhmAccountPassword = () => {
  return useMutation({
    mutationFn: ({ accountId, password }: { accountId: string; password?: string }) => resetAccountPassword(accountId, password)
  });
};

export const useChangeWhmAccountPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, planId }: { accountId: string; planId: string }) => changeAccountPlan(accountId, planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-accounts"] });
    }
  });
};

export const useCreateWhmPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-plans"] });
    }
  });
};

export const useUpdateWhmPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updatePlan(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-plans"] });
    }
  });
};

export const useDeleteWhmPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["whm-plans"] });
    }
  });
};
