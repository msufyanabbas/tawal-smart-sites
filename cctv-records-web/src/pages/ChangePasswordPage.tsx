import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { changePassword } from '@/api/auth';
import { changePasswordSchema, type ChangePasswordValues } from '@/utils/authSchema';
import { apiErrorMessage } from '@/utils/helpers';

export const ChangePasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = params.get('token') ?? '';

  const { register, handleSubmit, formState } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { token: tokenFromUrl, password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: ChangePasswordValues) => changePassword(v.token, v.password),
    onSuccess: () => {
      toast.success('Password updated — you can sign in now');
      navigate('/login', { replace: true });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change password')),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="card-title">Change password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use the reset token sent to your email to set a new password.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4"
        noValidate
      >
        <TextField
          label="Reset token"
          placeholder="Paste the token from the email"
          {...register('token')}
          error={formState.errors.token?.message}
          helper={tokenFromUrl ? 'Pre-filled from the link.' : undefined}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={formState.errors.password?.message}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={formState.errors.confirmPassword?.message}
        />
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Change password
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
};
