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
    if (!initialTestimonials) {
      const fetchTestimonials = async () => {
        setLoading(true);
        try {
          // Replace with your actual API endpoint
          const response = await fetch('/api/testimonials');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Testimonial[] = await response.json();
          setTestimonials(data);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      fetchTestimonials();
    }
  }, [initialTestimonials]);

  if (loading) {
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
          What Our Clients Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={testimonial.image}
                alt={`Portrait of ${testimonial.author}`}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
              </div>
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
    if (!initialTestimonials) {
      const fetchTestimonials = async () => {
        setLoading(true);
        try {
          // Replace with your actual API endpoint
          const response = await fetch('/api/testimonials');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Testimonial[] = await response.json();
          setTestimonials(data);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      fetchTestimonials();
    }
  }, [initialTestimonials]);

  if (loading) {
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
          What Our Clients Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={testimonial.image}
                alt={`Portrait of ${testimonial.author}`}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WriteTests;