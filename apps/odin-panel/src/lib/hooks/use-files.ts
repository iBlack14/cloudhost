import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFiles, createFolder, deleteFile, uploadFiles, moveFile, copyFile, type FileItem } from "../api";

export { type FileItem };

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
    mutationFn: ({ path, files, onProgress }: { path: string; files: FileList; onProgress?: (p: number) => void }) => uploadFiles(path, files, onProgress),
    onSuccess: (_, { path }) => {
      queryClient.invalidateQueries({ queryKey: ["files", path] });
    },
  });
};

export const useMoveFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldPath, newPath }: { oldPath: string; newPath: string }) => moveFile(oldPath, newPath),
    onSuccess: (_, { oldPath, newPath }) => {
      const srcDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
      const dstDir = newPath.substring(0, newPath.lastIndexOf("/")) || "/";
      queryClient.invalidateQueries({ queryKey: ["files", srcDir] });
      if (srcDir !== dstDir) queryClient.invalidateQueries({ queryKey: ["files", dstDir] });
    },
  });
};

export const useCopyFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourcePath, destPath }: { sourcePath: string; destPath: string }) => copyFile(sourcePath, destPath),
    onSuccess: (_, { destPath }) => {
      const dstDir = destPath.substring(0, destPath.lastIndexOf("/")) || "/";
      queryClient.invalidateQueries({ queryKey: ["files", dstDir] });
    },
  });
};
