import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { requestPasswordReset } from '@/api/auth';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/utils/authSchema';
import { apiErrorMessage } from '@/utils/helpers';

export const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState, reset } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: ForgotPasswordValues) => requestPasswordReset(v.email),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Reset link sent — check your inbox');
      reset();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send reset link')),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="card-title">Forgot password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we'll send you a reset link.
        </p>
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
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};
