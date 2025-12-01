import React, { useState, useEffect } from 'react';

interface Testimonial {
  id: number;
  author: string;
  title: string;
  text: string;
  image: string;
}

interface WriteTestsProps {
  testimonials?: Testimonial[];
}

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTestimonials, setCurrentTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        if (testimonials && testimonials.length > 0) {
          setCurrentTestimonials(testimonials);
        } else {
          // Mock data if no testimonials are passed as props
          const mockTestimonials: Testimonial[] = [
            {
              id: 1,
              author: 'John Doe',
              title: 'CEO, Company A',
              text: 'This service is amazing! It has helped us improve our code quality significantly.',
              image: 'https://via.placeholder.com/150',
            },
            {
              id: 2,
              author: 'Jane Smith',
              title: 'CTO, Company B',
              text: 'We were able to catch so many bugs before they made it to production thanks to these tests.',
              image: 'https://via.placeholder.com/150',
            },
          ];
          setCurrentTestimonials(mockTestimonials);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch testimonials.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p>Loading testimonials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Testimonials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {currentTestimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-lg shadow-md p-6"
              aria-label={`Testimonial from ${testimonial.author}`}
            >
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{testimonial.author}</h3>
                  <p className="text-sm text-gray-500">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700">{testimonial.text}</p>
            </div>
          ))}
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
  testimonials?: Testimonial[];
}

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTestimonials, setCurrentTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        if (testimonials && testimonials.length > 0) {
          setCurrentTestimonials(testimonials);
        } else {
          // Mock data if no testimonials are passed as props
          const mockTestimonials: Testimonial[] = [
            {
              id: 1,
              author: 'John Doe',
              title: 'CEO, Company A',
              text: 'This service is amazing! It has helped us improve our code quality significantly.',
              image: 'https://via.placeholder.com/150',
            },
            {
              id: 2,
              author: 'Jane Smith',
              title: 'CTO, Company B',
              text: 'We were able to catch so many bugs before they made it to production thanks to these tests.',
              image: 'https://via.placeholder.com/150',
            },
          ];
          setCurrentTestimonials(mockTestimonials);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch testimonials.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p>Loading testimonials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Testimonials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {currentTestimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-lg shadow-md p-6"
              aria-label={`Testimonial from ${testimonial.author}`}
            >
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{testimonial.author}</h3>
                  <p className="text-sm text-gray-500">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700">{testimonial.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WriteTests;