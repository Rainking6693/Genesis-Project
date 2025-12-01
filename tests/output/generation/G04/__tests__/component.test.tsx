import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../pages/index';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockData = {
  hero: {
    title: 'Welcome to Our Platform',
    subtitle: 'Discover amazing features',
    cta: 'Get Started',
  },
  features: [
    { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
    { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  ],
  testimonials: [
    { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
    { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
  ],
  stats: [
    { id: 1, value: '10K+', label: 'Happy Customers' },
    { id: 2, value: '100+', label: 'Features' },
  ],
};

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('hero-skeleton')).not.toBeInTheDocument();
      });
    });

    it('should render all sections after successful data fetch', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockData.features[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
        expect(screen.getByText(mockData.stats[0].value)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should display hero content with proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('region', { name: /hero section/i });
        const heading = within(heroSection).getByRole('heading', { level: 1 });

        expect(heading).toHaveTextContent(mockData.hero.title);
        expect(within(heroSection).getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(within(heroSection).getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });
    });

    it('should have accessible CTA button with proper ARIA attributes', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label', `Primary call to action: ${mockData.hero.cta}`);
        expect(ctaButton).toHaveClass('btn-primary');
      });
    });

    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        await userEvent.click(ctaButton);
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper structure', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        const featureCards = within(featuresSection).getAllByRole('article');

        expect(featureCards).toHaveLength(mockData.features.length);

        mockData.features.forEach((feature, index) => {
          const card = featureCards[index];
          expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(feature.title);
          expect(within(card).getByText(feature.description)).toBeInTheDocument();
          expect(within(card).getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have accessible feature cards with proper ARIA labels', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureCards = screen.getAllByRole('article');
        featureCards.forEach((card, index) => {
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${mockData.features[index].id}`);
        });
      });
    });

    it('should show feature details when "Learn More" button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
        const firstButton = learnMoreButtons[0];

        expect(screen.queryByTestId('feature-details-1')).not.toBeInTheDocument();

        await userEvent.click(firstButton);

        const details = await screen.findByTestId('feature-details-1');
        expect(details).toBeInTheDocument();
        expect(within(details).getByText(/detailed information/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display testimonials in a carousel format', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
        const testimonialItems = within(testimonialsSection).getAllByRole('article');

        expect(testimonialItems).toHaveLength(mockData.testimonials.length);

        mockData.testimonials.forEach((testimonial, index) => {
          const item = testimonialItems[index];
          expect(within(item).getByText(testimonial.quote)).toBeInTheDocument();
          expect(within(item).getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for carousel navigation', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const carousel = screen.getByRole('region', { name: /testimonials/i });
        expect(carousel).toHaveAttribute('aria-label', 'Customer testimonials');

        const prevButton = screen.getByLabelText(/previous testimonial/i);
        const nextButton = screen.getByLabelText(/next testimonial/i);

        expect(prevButton).toHaveAttribute('aria-disabled', 'true');
        expect(nextButton).toHaveAttribute('aria-disabled', 'false');
      });
    });

    it('should navigate between testimonials using buttons', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const firstTestimonial = screen.getByText(mockData.testimonials[0].quote);
        const secondTestimonial = screen.queryByText(mockData.testimonials[1].quote);

        expect(firstTestimonial).toBeVisible();
        expect(secondTestimonial).not.toBeVisible();

        const nextButton = screen.getByLabelText(/next testimonial/i);
        await userEvent.click(nextButton);

        expect(screen.queryByText(mockData.testimonials[0].quote)).not.toBeVisible();
        expect(screen.getByText(mockData.testimonials[1].quote)).toBeVisible();
      });
    });
  });

  describe('Statistics Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statsSection = screen.getByRole('region', { name: /statistics/i });
        const statItems = within(statsSection).getAllByRole('article');

        expect(statItems).toHaveLength(mockData.stats.length);

        mockData.stats.forEach((stat, index) => {
          const item = statItems[index];
          expect(within(item).getByText(stat.value)).toBeInTheDocument();
          expect(within(item).getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for statistics', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statItems = screen.getAllByRole('article');
        statItems.forEach((item, index) => {
          expect(item).toHaveAttribute('aria-labelledby', `stat-value-${mockData.stats[index].id}`);
        });
      });
    });
  });

  describe('Newsletter Section', () => {
    it('should allow users to subscribe to newsletter', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith('/api/newsletter', {
          email: 'test@example.com',
        });
      });
    });

    it('should show success message after successful subscription', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(await screen.findByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show error message when subscription fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Subscription failed'));

      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(await screen.findByText(/error subscribing/i)).toBeInTheDocument();
      });
    });

    it('should validate email format before submission', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'invalid-email');
        await userEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
        expect(axios.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

      render(<LandingPage />);

      expect(await screen.findByText(/error loading content/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch data'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(async () => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        await userEvent.click(retryButton);

        expect(await screen.findByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      render(<LandingPage />);

      expect(await screen.findByText(/no content available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmark roles', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /hero section/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /statistics/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /newsletter/i })).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        const h1 = headings.filter(h => h.tagName === 'H1');
        const h2 = headings.filter(h => h.tagName === 'H2');
        const h3 = headings.filter(h => h.tagName === 'H3');

        expect(h1).toHaveLength(1);
        expect(h2).toHaveLength(4); // Hero subtitle, Features, Testimonials, Stats
        expect(h3).toHaveLength(mockData.features.length);
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/previous testimonial/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/next testimonial/i)).toHaveAttribute('aria-label');
        expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label');
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        const emailInput = screen.getByLabelText(/email address/i);

        // Tab to CTA button
        await userEvent.tab();
        expect(ctaButton).toHaveFocus();

        // Space to click
        await userEvent.keyboard('{space}');
        expect(mockPush).toHaveBeenCalled();

        // Tab to email input
        await userEvent.tab();
        await userEvent.tab();
        expect(emailInput).toHaveFocus();

        // Type email
        await userEvent.keyboard('test@example.com');

        // Tab to submit button and click with Enter
        await userEvent.tab();
        await userEvent.keyboard('{enter}');

        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile viewports', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        const featureCards = within(featuresSection).getAllByRole('article');

        // In mobile, features should stack vertically
        mockData.features.forEach((_, index) => {
          if (index > 0) {
            const prevCard = featureCards[index - 1];
            const currentCard = featureCards[index];
            // This is a simplified check - in real tests you might use more sophisticated layout checks
            expect(prevCard.compareDocumentPosition(currentCard)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
          }
        });
      });
    });

    it('should show mobile menu button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/open menu/i)).toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import LandingPage from '../pages/index';
import '@testing-library/jest-dom';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
  query: {},
}));

const mockData = {
  hero: {
    title: 'Welcome to Our Platform',
    subtitle: 'Discover amazing features',
    cta: 'Get Started',
  },
  features: [
    { id: 1, title: 'Feature 1', description: 'Description 1', icon: 'icon1' },
    { id: 2, title: 'Feature 2', description: 'Description 2', icon: 'icon2' },
  ],
  testimonials: [
    { id: 1, name: 'User 1', quote: 'Great product!', role: 'Customer' },
    { id: 2, name: 'User 2', quote: 'Highly recommend', role: 'Client' },
  ],
  stats: [
    { id: 1, value: '10K+', label: 'Happy Customers' },
    { id: 2, value: '100+', label: 'Features' },
  ],
};

describe('Landing Page - Core Functionality', () => {
  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while data is being fetched', async () => {
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: mockData }), 1000))
      );

      render(<LandingPage />);

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('features-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('testimonials-skeleton')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('hero-skeleton')).not.toBeInTheDocument();
      });
    });

    it('should render all sections after successful data fetch', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByText(mockData.hero.title)).toBeInTheDocument();
        expect(screen.getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(screen.getByText(mockData.features[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockData.testimonials[0].quote)).toBeInTheDocument();
        expect(screen.getByText(mockData.stats[0].value)).toBeInTheDocument();
      });
    });
  });

  describe('Hero Section', () => {
    it('should display hero content with proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('region', { name: /hero section/i });
        const heading = within(heroSection).getByRole('heading', { level: 1 });

        expect(heading).toHaveTextContent(mockData.hero.title);
        expect(within(heroSection).getByText(mockData.hero.subtitle)).toBeInTheDocument();
        expect(within(heroSection).getByRole('button', { name: mockData.hero.cta })).toBeInTheDocument();
      });
    });

    it('should have accessible CTA button with proper ARIA attributes', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        expect(ctaButton).toHaveAttribute('aria-label', `Primary call to action: ${mockData.hero.cta}`);
        expect(ctaButton).toHaveClass('btn-primary');
      });
    });

    it('should navigate to signup page when CTA button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        await userEvent.click(ctaButton);
        expect(mockPush).toHaveBeenCalledWith('/signup');
      });
    });
  });

  describe('Features Section', () => {
    it('should display all features with proper structure', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        const featureCards = within(featuresSection).getAllByRole('article');

        expect(featureCards).toHaveLength(mockData.features.length);

        mockData.features.forEach((feature, index) => {
          const card = featureCards[index];
          expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(feature.title);
          expect(within(card).getByText(feature.description)).toBeInTheDocument();
          expect(within(card).getByTestId(`feature-icon-${feature.id}`)).toBeInTheDocument();
        });
      });
    });

    it('should have accessible feature cards with proper ARIA labels', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const featureCards = screen.getAllByRole('article');
        featureCards.forEach((card, index) => {
          expect(card).toHaveAttribute('aria-labelledby', `feature-title-${mockData.features[index].id}`);
        });
      });
    });

    it('should show feature details when "Learn More" button is clicked', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const learnMoreButtons = screen.getAllByRole('button', { name: /learn more/i });
        const firstButton = learnMoreButtons[0];

        expect(screen.queryByTestId('feature-details-1')).not.toBeInTheDocument();

        await userEvent.click(firstButton);

        const details = await screen.findByTestId('feature-details-1');
        expect(details).toBeInTheDocument();
        expect(within(details).getByText(/detailed information/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testimonials Section', () => {
    it('should display testimonials in a carousel format', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const testimonialsSection = screen.getByRole('region', { name: /testimonials/i });
        const testimonialItems = within(testimonialsSection).getAllByRole('article');

        expect(testimonialItems).toHaveLength(mockData.testimonials.length);

        mockData.testimonials.forEach((testimonial, index) => {
          const item = testimonialItems[index];
          expect(within(item).getByText(testimonial.quote)).toBeInTheDocument();
          expect(within(item).getByText(`${testimonial.name}, ${testimonial.role}`)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for carousel navigation', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const carousel = screen.getByRole('region', { name: /testimonials/i });
        expect(carousel).toHaveAttribute('aria-label', 'Customer testimonials');

        const prevButton = screen.getByLabelText(/previous testimonial/i);
        const nextButton = screen.getByLabelText(/next testimonial/i);

        expect(prevButton).toHaveAttribute('aria-disabled', 'true');
        expect(nextButton).toHaveAttribute('aria-disabled', 'false');
      });
    });

    it('should navigate between testimonials using buttons', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const firstTestimonial = screen.getByText(mockData.testimonials[0].quote);
        const secondTestimonial = screen.queryByText(mockData.testimonials[1].quote);

        expect(firstTestimonial).toBeVisible();
        expect(secondTestimonial).not.toBeVisible();

        const nextButton = screen.getByLabelText(/next testimonial/i);
        await userEvent.click(nextButton);

        expect(screen.queryByText(mockData.testimonials[0].quote)).not.toBeVisible();
        expect(screen.getByText(mockData.testimonials[1].quote)).toBeVisible();
      });
    });
  });

  describe('Statistics Section', () => {
    it('should display all statistics with proper formatting', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statsSection = screen.getByRole('region', { name: /statistics/i });
        const statItems = within(statsSection).getAllByRole('article');

        expect(statItems).toHaveLength(mockData.stats.length);

        mockData.stats.forEach((stat, index) => {
          const item = statItems[index];
          expect(within(item).getByText(stat.value)).toBeInTheDocument();
          expect(within(item).getByText(stat.label)).toBeInTheDocument();
        });
      });
    });

    it('should have proper ARIA attributes for statistics', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const statItems = screen.getAllByRole('article');
        statItems.forEach((item, index) => {
          expect(item).toHaveAttribute('aria-labelledby', `stat-value-${mockData.stats[index].id}`);
        });
      });
    });
  });

  describe('Newsletter Section', () => {
    it('should allow users to subscribe to newsletter', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(axios.post).toHaveBeenCalledWith('/api/newsletter', {
          email: 'test@example.com',
        });
      });
    });

    it('should show success message after successful subscription', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(await screen.findByText(/thank you for subscribing/i)).toBeInTheDocument();
      });
    });

    it('should show error message when subscription fails', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Subscription failed'));

      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.click(submitButton);

        expect(await screen.findByText(/error subscribing/i)).toBeInTheDocument();
      });
    });

    it('should validate email format before submission', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /subscribe/i });

        await userEvent.type(emailInput, 'invalid-email');
        await userEvent.click(submitButton);

        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
        expect(axios.post).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

      render(<LandingPage />);

      expect(await screen.findByText(/error loading content/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should retry data fetch when retry button is clicked', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch data'))
        .mockResolvedValueOnce({ data: mockData });

      render(<LandingPage />);

      await waitFor(async () => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        await userEvent.click(retryButton);

        expect(await screen.findByText(mockData.hero.title)).toBeInTheDocument();
      });
    });

    it('should handle empty data response gracefully', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });

      render(<LandingPage />);

      expect(await screen.findByText(/no content available/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper document structure with landmark roles', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /hero section/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /features/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /testimonials/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /statistics/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /newsletter/i })).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        const h1 = headings.filter(h => h.tagName === 'H1');
        const h2 = headings.filter(h => h.tagName === 'H2');
        const h3 = headings.filter(h => h.tagName === 'H3');

        expect(h1).toHaveLength(1);
        expect(h2).toHaveLength(4); // Hero subtitle, Features, Testimonials, Stats
        expect(h3).toHaveLength(mockData.features.length);
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: mockData.hero.cta })).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/previous testimonial/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/next testimonial/i)).toHaveAttribute('aria-label');
        expect(screen.getByRole('button', { name: /subscribe/i })).toHaveAttribute('aria-label');
      });
    });

    it('should be navigable via keyboard', async () => {
      render(<LandingPage />);

      await waitFor(async () => {
        const ctaButton = screen.getByRole('button', { name: mockData.hero.cta });
        const emailInput = screen.getByLabelText(/email address/i);

        // Tab to CTA button
        await userEvent.tab();
        expect(ctaButton).toHaveFocus();

        // Space to click
        await userEvent.keyboard('{space}');
        expect(mockPush).toHaveBeenCalled();

        // Tab to email input
        await userEvent.tab();
        await userEvent.tab();
        expect(emailInput).toHaveFocus();

        // Type email
        await userEvent.keyboard('test@example.com');

        // Tab to submit button and click with Enter
        await userEvent.tab();
        await userEvent.keyboard('{enter}');

        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile viewports', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        const featuresSection = screen.getByRole('region', { name: /features/i });
        const featureCards = within(featuresSection).getAllByRole('article');

        // In mobile, features should stack vertically
        mockData.features.forEach((_, index) => {
          if (index > 0) {
            const prevCard = featureCards[index - 1];
            const currentCard = featureCards[index];
            // This is a simplified check - in real tests you might use more sophisticated layout checks
            expect(prevCard.compareDocumentPosition(currentCard)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
          }
        });
      });
    });

    it('should show mobile menu button on small screens', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/open menu/i)).toBeInTheDocument();
      });
    });
  });
});