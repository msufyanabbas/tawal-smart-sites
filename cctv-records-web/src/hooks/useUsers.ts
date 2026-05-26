import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/users';
import type { CreateUserPayload, Role, UpdateUserPayload } from '@/types';

export const usersKeys = {
  all: ['users'] as const,
  list: (role?: Role) => ['users', 'list', role ?? 'all'] as const,
  detail: (id: string) => ['users', id] as const,
};

export const useUsersQuery = (role?: Role) =>
  useQuery({ queryKey: usersKeys.list(role), queryFn: () => api.listUsers(role) });

export const useUserQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? usersKeys.detail(id) : ['users', 'none'],
    queryFn: () => api.getUser(id as string),
    enabled: !!id,
  });

export const useCreateUserMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => api.createUser(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: usersKeys.all }); },
  });
};

export const useUpdateUserMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      api.updateUser(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: usersKeys.all }); },
  });
};

export const useDeleteUserMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: usersKeys.all }); },
  });
};
