"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEmailAccount,
  fetchEmailAccountById,
  fetchEmailAccounts,
  fetchMailboxMessages,
  fetchEmailDomains,
  runEmailAccountAction,
  updateEmailAccountPassword
} from "../email";
import {
  createEmailAccountSchema,
  type CreateEmailAccountInput
} from "../schemas/email-account";

export const useEmailAccounts = () => {
  return useQuery({
    queryKey: ["email-accounts"],
    queryFn: fetchEmailAccounts
  });
};

export const useEmailDomains = () => {
  return useQuery({
    queryKey: ["email-domains"],
    queryFn: fetchEmailDomains
  });
};

export const useEmailAccount = (accountId: string) => {
  return useQuery({
    queryKey: ["email-account", accountId],
    queryFn: () => fetchEmailAccountById(accountId),
    enabled: Boolean(accountId)
  });
};

export const useMailboxMessages = (accountId: string) => {
  return useQuery({
    queryKey: ["email-mailbox", accountId],
    queryFn: () => fetchMailboxMessages(accountId),
    enabled: Boolean(accountId)
  });
};

export const useCreateEmailAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailAccountInput) => {
      const parsed = createEmailAccountSchema.parse(input);
      return createEmailAccount(parsed);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["email-domains"] });
    }
  });
};

export const useEmailAccountAction = () => {
  return useMutation({
    mutationFn: ({
      accountId,
      action,
      payload
    }: {
      accountId: string;
      action: "check-email" | "manage" | "connect-devices";
      payload?: { password?: string };
    }) => {
      if (action === "manage" && payload?.password) {
        return updateEmailAccountPassword(accountId, payload.password);
      }
      return runEmailAccountAction(accountId, action);
    }
  });
};
