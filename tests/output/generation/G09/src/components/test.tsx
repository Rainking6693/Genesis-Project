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
        // Simulate API call or use provided testimonials
        if (testimonials && testimonials.length > 0) {
          setCurrentTestimonials(testimonials);
        } else {
          // Replace with actual API endpoint
          const response = await fetch('/api/testimonials');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Testimonial[] = await response.json();
          setCurrentTestimonials(data);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred while fetching testimonials.');
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
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-semibold text-center mb-8">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                  aria-label={`Image of ${testimonial.author}`}
                />
                <div>
                  <h3 className="text-lg font-semibold">{testimonial.author}</h3>
                  <p className="text-gray-500">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
        // Simulate API call or use provided testimonials
        if (testimonials && testimonials.length > 0) {
          setCurrentTestimonials(testimonials);
        } else {
          // Replace with actual API endpoint
          const response = await fetch('/api/testimonials');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Testimonial[] = await response.json();
          setCurrentTestimonials(data);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred while fetching testimonials.');
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
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-semibold text-center mb-8">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                  aria-label={`Image of ${testimonial.author}`}
                />
                <div>
                  <h3 className="text-lg font-semibold">{testimonial.author}</h3>
                  <p className="text-gray-500">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WriteTests;