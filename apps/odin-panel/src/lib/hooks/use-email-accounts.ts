"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEmailAccount,
  fetchEmailAccountById,
  fetchEmailAccounts,
  fetchMailboxMessages,
  fetchEmailDomains,
  runEmailAccountAction
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
      action
    }: {
      accountId: string;
      action: "check-email" | "manage" | "connect-devices";
    }) => runEmailAccountAction(accountId, action)
  });
};
