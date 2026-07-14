import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFtpAccounts, createFtpAccount, deleteFtpAccount, updateFtpPassword, type FtpAccount } from "../api";

export const useFtpAccounts = () => {
  return useQuery<FtpAccount[]>({
    queryKey: ["ftp-accounts"],
    queryFn: fetchFtpAccounts,
    refetchOnWindowFocus: false,
  });
};

export const useCreateFtpAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFtpAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ftp-accounts"] });
    },
  });
};

export const useDeleteFtpAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFtpAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ftp-accounts"] });
    },
  });
};

export const useUpdateFtpPassword = () => {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => updateFtpPassword(id, password),
  });
};
