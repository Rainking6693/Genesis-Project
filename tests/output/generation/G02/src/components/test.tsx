import React, { useState, useEffect } from 'react';

interface Testimonial {
  id: number;
  author: string;
  title: string;
  text: string;
  image: string;
}

interface TestimonialsProps {
  testimonials: Testimonial[];
  isLoading: boolean;
  error: string | null;
}

const WriteTests: React.FC<TestimonialsProps> = ({ testimonials, isLoading, error }) => {
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [testimonials.length]);

  const handlePrevClick = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1));
  };

  const handleNextClick = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

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

  if (!testimonials || testimonials.length === 0) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p>No testimonials available.</p>
        </div>
      </div>
    );
  }

  const currentTestimonial = testimonials[currentTestimonialIndex];

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
          <div className="md:grid md:grid-cols-3 md:gap-8">
            <div className="col-span-1">
              <button
                onClick={handlePrevClick}
                aria-label="Previous Testimonial"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
              >
                &lt;
              </button>
            </div>
            <div className="col-span-1 text-center">
              <img
                className="h-24 w-24 rounded-full mx-auto"
                src={currentTestimonial.image}
                alt={currentTestimonial.author}
              />
              <h3 className="text-lg font-medium text-gray-900 mt-4">{currentTestimonial.author}</h3>
              <p className="text-indigo-600">{currentTestimonial.title}</p>
            </div>
            <div className="col-span-1">
              <button
                onClick={handleNextClick}
                aria-label="Next Testimonial"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
              >
                &gt;
              </button>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl text-gray-500 italic">"{currentTestimonial.text}"</p>
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

interface TestimonialsProps {
  testimonials: Testimonial[];
  isLoading: boolean;
  error: string | null;
}

const WriteTests: React.FC<TestimonialsProps> = ({ testimonials, isLoading, error }) => {
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [testimonials.length]);

  const handlePrevClick = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1));
  };

  const handleNextClick = () => {
    setCurrentTestimonialIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

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

  if (!testimonials || testimonials.length === 0) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p>No testimonials available.</p>
        </div>
      </div>
    );
  }

  const currentTestimonial = testimonials[currentTestimonialIndex];

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
          <div className="md:grid md:grid-cols-3 md:gap-8">
            <div className="col-span-1">
              <button
                onClick={handlePrevClick}
                aria-label="Previous Testimonial"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
              >
                &lt;
              </button>
            </div>
            <div className="col-span-1 text-center">
              <img
                className="h-24 w-24 rounded-full mx-auto"
                src={currentTestimonial.image}
                alt={currentTestimonial.author}
              />
              <h3 className="text-lg font-medium text-gray-900 mt-4">{currentTestimonial.author}</h3>
              <p className="text-indigo-600">{currentTestimonial.title}</p>
            </div>
            <div className="col-span-1">
              <button
                onClick={handleNextClick}
                aria-label="Next Testimonial"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
              >
                &gt;
              </button>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl text-gray-500 italic">"{currentTestimonial.text}"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WriteTests;