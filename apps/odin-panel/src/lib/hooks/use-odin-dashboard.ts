"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOdinDashboard } from "../api";

export const useOdinDashboard = () => {
  return useQuery({
    queryKey: ["odin-dashboard"],
    queryFn: fetchOdinDashboard,
    refetchInterval: 15000
  });
};
