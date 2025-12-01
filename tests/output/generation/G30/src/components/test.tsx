import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { StarIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const reviewSchema = z.object({
  rating: z.number().min(1, { message: 'Rating is required' }).max(5),
  title: z.string().min(2, { message: 'Title must be at least 2 characters' }).max(100),
  content: z.string().min(10, { message: 'Review must be at least 10 characters' }).max(2000),
  nickname: z.string().min(2, { message: 'Nickname must be at least 2 characters' }).max(50),
  email: z.string().email({ message: 'Invalid email address' }),
  recommend: z.boolean().optional(),
  productId: z.string().uuid(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface WriteReviewProps {
  productId: string;
  productName: string;
  onSuccess?: () => void;
}

interface SubmitReviewResponse {
  success: boolean;
  message?: string;
  reviewId?: string;
}

const WriteReview = ({ productId, productName, onSuccess }: WriteReviewProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
    setValue,
    watch,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      productId,
      recommend: true,
    },
    mode: 'onChange',
  });

  const rating = watch('rating');

  const submitReview = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit review');
      }

      return response.json() as Promise<SubmitReviewResponse>;
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Review submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit review. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit: SubmitHandler<ReviewFormData> = useCallback(
    (data) => {
      submitReview.mutate(data);
    },
    [submitReview]
  );

  const handleRatingChange = useCallback((newRating: number) => {
    setValue('rating', newRating, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Write a Review for {productName}</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Rating Section */}
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => handleRatingChange(star)}
                aria-label={`Rate ${star} out of 5 stars`}
                className={`focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                <StarIcon className="h-8 w-8" />
              </button>
            ))}
          </div>
          {errors.rating && (
            <p className="mt-2 text-sm text-red-600" id="rating-error">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              {errors.rating.message}
            </p>
          )}
        </div>

        {/* Title Section */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Review Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="title"
            {...register('title')}
            aria-invalid={errors.title ? 'true' : 'false'}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Summarize your experience"
          />
          {errors.title && (
            <p className="mt-2 text-sm text-red-600" id="title-error">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Content Section */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Your Review <span className="text-red-600">*</span>
          </label>
          <textarea
            id="content"
            rows={6}
            {...register('content')}
            aria-invalid={errors.content ? 'true' : 'false'}
            aria-describedby={errors.content ? 'content-error' : undefined}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.content ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Share your thoughts about this product..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {watch('content')?.length || 0}/2000 characters
          </p>
          {errors.content && (
            <p className="mt-2 text-sm text-red-600" id="content-error">
              <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
              {errors.content.message}
            </p>
          )}
        </div>

        {/* Recommend Section */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="recommend"
              type="checkbox"
              {...register('recommend')}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="recommend" className="font-medium text-gray-700">
              I recommend this product
            </label>
          </div>
        </div>

        {/* User Info Section */}
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
              Nickname <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="nickname"
              {...register('nickname')}
              aria-invalid={errors.nickname ? 'true' : 'false'}
              aria-describedby={errors.nickname ? 'nickname-error' : undefined}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.nickname ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="How should we display your name?"
            />
            {errors.nickname && (
              <p className="mt-2 text-sm text-red-600" id="nickname-error">
                <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                {errors.nickname.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              id="email"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="We'll never share your email"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600" id="email-error">
                <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              !isValid || isSubmitting
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          By submitting a review, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:underline">
            Terms of Use
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </div>
  );
};

export default WriteReview;