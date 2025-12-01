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

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials: initialTestimonials }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockTestimonials: Testimonial[] = [
          {
            id: 1,
            author: 'John Doe',
            title: 'CEO, Company A',
            text: 'This service has revolutionized our testing process. Highly recommended!',
            image: 'https://via.placeholder.com/50x50'
          },
          {
            id: 2,
            author: 'Jane Smith',
            title: 'CTO, Company B',
            text: 'The quality of the tests is outstanding. We\'ve seen a significant reduction in bugs.',
            image: 'https://via.placeholder.com/50x50'
          }
        ];

        setTestimonials(mockTestimonials);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch testimonials.');
      } finally {
        setLoading(false);
      }
    };

    if (!initialTestimonials) {
      fetchTestimonials();
    }
  }, [initialTestimonials]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p>Loading testimonials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Write Tests. Get Results.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
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

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials: initialTestimonials }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockTestimonials: Testimonial[] = [
          {
            id: 1,
            author: 'John Doe',
            title: 'CEO, Company A',
            text: 'This service has revolutionized our testing process. Highly recommended!',
            image: 'https://via.placeholder.com/50x50'
          },
          {
            id: 2,
            author: 'Jane Smith',
            title: 'CTO, Company B',
            text: 'The quality of the tests is outstanding. We\'ve seen a significant reduction in bugs.',
            image: 'https://via.placeholder.com/50x50'
          }
        ];

        setTestimonials(mockTestimonials);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch testimonials.');
      } finally {
        setLoading(false);
      }
    };

    if (!initialTestimonials) {
      fetchTestimonials();
    }
  }, [initialTestimonials]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p>Loading testimonials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
          Write Tests. Get Results.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
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