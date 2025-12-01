import React, { useState, useEffect } from 'react';

interface Testimonial {
  id: number;
  author: string;
  title: string;
  text: string;
  image: string;
}

interface WriteTestsProps {
  testimonials: Testimonial[];
}

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Simulate loading delay and potential error
      setTimeout(() => {
        if (Math.random() < 0.2) {
          setError('Failed to load testimonials.');
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }, 1000);
    }
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p>Loading testimonials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Testimonials</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            What people are saying
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Read what our satisfied customers have to say about our services.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <img src={testimonial.image} alt={testimonial.author} className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{testimonial.author}</p>
                  <p className="ml-16 text-sm text-gray-500">{testimonial.title}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  {testimonial.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default WriteTests;

import React, { useState, useEffect } from 'react';

interface Testimonial {
  id: number;
  author: string;
  title: string;
  text: string;
  image: string;
}

interface WriteTestsProps {
  testimonials: Testimonial[];
}

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Simulate loading delay and potential error
      setTimeout(() => {
        if (Math.random() < 0.2) {
          setError('Failed to load testimonials.');
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }, 1000);
    }
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p>Loading testimonials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Testimonials</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            What people are saying
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Read what our satisfied customers have to say about our services.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <img src={testimonial.image} alt={testimonial.author} className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{testimonial.author}</p>
                  <p className="ml-16 text-sm text-gray-500">{testimonial.title}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  {testimonial.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default WriteTests;