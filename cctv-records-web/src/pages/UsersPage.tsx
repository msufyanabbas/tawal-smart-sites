import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { SelectField } from '@/components/SelectField';
import { FullPageSpinner } from '@/components/Spinner';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '@/hooks/useUsers';
import { Role, type AppUser, type CreateUserPayload } from '@/types';
import { apiErrorMessage, formatDate, roleLabel } from '@/utils/helpers';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().optional().or(z.literal('')),
  role: z.nativeEnum(Role),
  isApproved: z.boolean(),
});
type EditValues = z.infer<typeof editSchema>;

// ── Create / Edit modal ────────────────────────────────────────────────────

const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const CreateUserModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const create = useCreateUserMutation();
  const { register, handleSubmit, formState, reset } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: Role.TECHNICIAN } as CreateValues,
  });

  const onSubmit = async (values: CreateValues) => {
    try {
      const payload: CreateUserPayload = { ...values, isApproved: true };
      await create.mutateAsync(payload);
      toast.success('User created');
      reset();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create user'));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="card-title mb-3">New user</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <TextField label="Name" {...register('name')} error={formState.errors.name?.message} />
        <TextField label="Email" type="email" {...register('email')} error={formState.errors.email?.message} />
        <TextField
          label="Password"
          type="password"
          {...register('password')}
          error={formState.errors.password?.message}
        />
        <SelectField
          label="Role"
          {...register('role')}
          error={formState.errors.role?.message}
          options={Object.values(Role).map((r) => ({ value: r, label: roleLabel(r) }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};

const EditUserModal: React.FC<{
  user: AppUser | null;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const update = useUpdateUserMutation();
  const { register, handleSubmit, formState, reset } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: user
      ? {
          name: user.name ?? '',
          email: user.email,
          password: '',
          role: user.role,
          isApproved: user.isApproved,
        }
      : (undefined as any),
  });

  const onSubmit = async (values: EditValues) => {
    if (!user) return;
    const payload: any = {
      name: values.name,
      email: values.email,
      role: values.role,
      isApproved: values.isApproved,
    };
    if (values.password && values.password.length >= 8) payload.password = values.password;
    try {
      await update.mutateAsync({ id: user.id, payload });
      toast.success('User updated');
      reset();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update user'));
    }
  };

  return (
    <Modal open={!!user} onClose={onClose}>
      <h2 className="card-title mb-3">Edit user</h2>
      {user && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <TextField label="Name" {...register('name')} error={formState.errors.name?.message} />
          <TextField label="Email" type="email" {...register('email')} error={formState.errors.email?.message} />
          <TextField
            label="New password (optional)"
            type="password"
            placeholder="Leave blank to keep current"
            {...register('password')}
          />
          <SelectField
            label="Role"
            {...register('role')}
            options={Object.values(Role).map((r) => ({ value: r, label: roleLabel(r) }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isApproved')} className="h-4 w-4 rounded border-slate-300" />
            Approved
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>Save</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────

export const UsersPage: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const { data: users, isLoading, error } = useUsersQuery(
    roleFilter === '' ? undefined : roleFilter,
  );
  const del = useDeleteUserMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const onDelete = async (u: AppUser) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await del.mutateAsync(u.id);
      toast.success('User deleted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete user'));
    }
  };

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{users?.length ?? 0} users</p>
        </div>
        <div className="flex items-end gap-3">
          <SelectField
            label="Filter by role"
            placeholder="All roles"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | '')}
            options={Object.values(Role).map((r) => ({ value: r, label: roleLabel(r) }))}
          />
          <Button onClick={() => setCreateOpen(true)}>+ New user</Button>
        </div>
      </header>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-sm text-red-700">
            {apiErrorMessage(error, 'Could not load users')}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-700">Name</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Role</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Approved</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Created</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">{u.name || '—'}</td>
                <td className="px-3 py-2 text-slate-700">{u.email}</td>
                <td className="px-3 py-2"><span className="chip">{roleLabel(u.role)}</span></td>
                <td className="px-3 py-2">
                  {u.isApproved
                    ? <span className="text-green-600 font-semibold">Yes</span>
                    : <span className="text-amber-600">Pending</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(u)} className="mr-3 text-brand-700 hover:underline text-xs">
                    Edit
                  </button>
                  <button onClick={() => onDelete(u)} className="text-red-600 hover:underline text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {(users ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">No users yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditUserModal user={editing} onClose={() => setEditing(null)} />
    </div>
  );
};
