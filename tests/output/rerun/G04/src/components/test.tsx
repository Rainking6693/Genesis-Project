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
    if (testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Simulate loading data (replace with actual API call)
      setTimeout(() => {
        setIsLoading(false);
        setError("Failed to load testimonials.");
      }, 1500);
    }
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-semibold mb-8">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
              <img
                src={testimonial.image}
                alt={testimonial.author}
                className="w-24 h-24 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">{testimonial.author}</h3>
              <p className="text-gray-600 mb-2">{testimonial.title}</p>
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
  testimonials: Testimonial[];
}

const WriteTests: React.FC<WriteTestsProps> = ({ testimonials }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testimonials.length > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Simulate loading data (replace with actual API call)
      setTimeout(() => {
        setIsLoading(false);
        setError("Failed to load testimonials.");
      }, 1500);
    }
  }, [testimonials]);

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-semibold mb-8">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
              <img
                src={testimonial.image}
                alt={testimonial.author}
                className="w-24 h-24 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">{testimonial.author}</h3>
              <p className="text-gray-600 mb-2">{testimonial.title}</p>
              <p className="text-gray-700 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WriteTests;