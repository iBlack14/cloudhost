import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFiles, createFolder, deleteFile, uploadFiles, type FileItem } from "../api";

export const useFiles = (path: string) => {
  return useQuery<FileItem[]>({
    queryKey: ["files", path],
    queryFn: () => fetchFiles(path),
    refetchOnWindowFocus: false,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPath: string) => createFolder(newPath),
    onSuccess: (_, newPath) => {
      const parentDir = newPath.substring(0, newPath.lastIndexOf("/")) || "/";
      queryClient.invalidateQueries({ queryKey: ["files", parentDir] });
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => deleteFile(path),
    onSuccess: (_, path) => {
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      queryClient.invalidateQueries({ queryKey: ["files", parentDir] });
    },
  });
};

export const useUploadFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, files }: { path: string; files: FileList }) => uploadFiles(path, files),
    onSuccess: (_, { path }) => {
      queryClient.invalidateQueries({ queryKey: ["files", path] });
    },
  });
};
