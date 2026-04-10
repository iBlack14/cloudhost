"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAccount,
  fetchAccounts,
  fetchPlans,
  impersonateAccount,
  resumeAccount,
  suspendAccount
} from "../api";
import { whmCreateAccountSchema, type WhmCreateAccountInput } from "../schemas/whm-create-account";

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
