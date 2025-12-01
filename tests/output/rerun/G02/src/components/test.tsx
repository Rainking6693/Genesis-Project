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
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setError("No testimonials found.");
    }
  }, [testimonials]);

  const handleNext = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

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
        <p>Error: {error}</p>
      </div>
    );
  }

  const currentTestimonial = testimonials[currentTestimonialIndex];

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">What Our Clients Say</h2>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-4">
            <img
              src={currentTestimonial.image}
              alt={currentTestimonial.author}
              className="w-16 h-16 rounded-full mr-4"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{currentTestimonial.author}</h3>
              <p className="text-sm text-gray-500">{currentTestimonial.title}</p>
            </div>
          </div>
          <p className="text-gray-700 italic">"{currentTestimonial.text}"</p>
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrev}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              aria-label="Previous testimonial"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              aria-label="Next testimonial"
            >
              Next
            </button>
          </div>
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
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    if (testimonials && testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setError("No testimonials found.");
    }
  }, [testimonials]);

  const handleNext = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

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
        <p>Error: {error}</p>
      </div>
    );
  }

  const currentTestimonial = testimonials[currentTestimonialIndex];

  return (
    <div className="bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">What Our Clients Say</h2>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-4">
            <img
              src={currentTestimonial.image}
              alt={currentTestimonial.author}
              className="w-16 h-16 rounded-full mr-4"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{currentTestimonial.author}</h3>
              <p className="text-sm text-gray-500">{currentTestimonial.title}</p>
            </div>
          </div>
          <p className="text-gray-700 italic">"{currentTestimonial.text}"</p>
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrev}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              aria-label="Previous testimonial"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              aria-label="Next testimonial"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WriteTests;