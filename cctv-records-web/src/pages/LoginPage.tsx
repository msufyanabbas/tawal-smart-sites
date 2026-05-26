import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { login } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginValues } from '@/utils/authSchema';
import { apiErrorMessage } from '@/utils/helpers';

export const LoginPage: React.FC = () => {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginValues) => login(email, password),
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user);
      toast.success('Welcome back');
      navigate(redirectTo, { replace: true });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Login failed')),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="card-title">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Use your approved account credentials.</p>
      </div>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4"
        noValidate
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={formState.errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={formState.errors.password?.message}
        />

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={mutation.isPending} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
};
