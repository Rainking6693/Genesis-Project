import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';

// Types
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
};

type TestResult = {
  id: string;
  productId: string;
  title: string;
  description: string;
  rating: number;
  date: string;
  author: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
};

type WriteTestFormInputs = {
  title: string;
  description: string;
  rating: number;
  productId: string;
};

// Schema
const testSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  rating: z.number().min(1).max(5),
  productId: z.string().min(1, 'Product ID is required'),
});

const WriteTest = ({ product, onClose }: { product: Product; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<WriteTestFormInputs>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      description: '',
      rating: 5,
      productId: product.id,
    },
  });

  const submitTest = useMutation({
    mutationFn: async (data: WriteTestFormInputs) => {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit test');
      }

      return response.json() as Promise<TestResult>;
    },
    onSuccess: () => {
      toast.success('Test submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['product-tests', product.id] });
      reset();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit test');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit: SubmitHandler<WriteTestFormInputs> = useCallback(
    (data) => {
      setIsSubmitting(true);
      submitTest.mutate(data);
    },
    [submitTest]
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4"
      aria-labelledby="test-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative mx-auto max-w-2xl transform divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-xl transition-all">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 id="test-modal-title" className="text-lg font-medium text-gray-900">
            Write a Test for {product.name}
          </h2>
          <button
            type="button"
            className="rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
                Rating
              </label>
              <div className="mt-1 flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className={`focus:ring-indigo-500 h-8 w-8 focus:outline-none ${
                      star <= (watch('rating') || 0) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={() => setValue('rating', star)}
                    aria-label={`${star} star rating`}
                  >
                    <span className="sr-only">{star} star{star !== 1 ? 's' : ''}</span>
                    ★
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <div className="mt-1">
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="What's most important to know?"
                  aria-invalid={errors.title ? 'true' : 'false'}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  rows={6}
                  {...register('description')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Share your experience with this product..."
                  aria-invalid={errors.description ? 'true' : 'false'}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Submit Test
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteTest;