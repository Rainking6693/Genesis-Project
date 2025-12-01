import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockAnalytics = {
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
};

const mockAuth = {
  user: { id: '123', name: 'Test User' },
  isAuthenticated: true,
};

const mockDesignData = {
  id: 'arch-1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  categories: ['residential', 'commercial'],
  images: [
    { id: 'img-1', url: '/modern-1.jpg', alt: 'Modern building 1' },
    { id: 'img-2', url: '/modern-2.jpg', alt: 'Modern building 2' },
  ],
  features: ['sustainable', 'smart-home', 'open-space'],
  rating: 4.5,
  reviewsCount: 120,
  createdAt: '2023-01-15T10:00:00Z',
};

const mockRelatedDesigns = [
  {
    id: 'arch-2',
    title: 'Minimalist Design',
    thumbnail: '/minimalist.jpg',
    rating: 4.2,
  },
  {
    id: 'arch-3',
    title: 'Industrial Style',
    thumbnail: '/industrial.jpg',
    rating: 4.0,
  },
];

const renderComponent = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    (useAnalytics as jest.Mock).mockReturnValue(mockAnalytics);
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockImplementationOnce(() => new Promise(() => {}));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('related-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      const errorMessages = await screen.findAllByTestId('error-message');
      expect(errorMessages).toHaveLength(2);
      expect(screen.queryByTestId('design-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Main Content Rendering', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should render all design information correctly', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(mockDesignData.title)).toBeInTheDocument();
        expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
        expect(screen.getByText(`Rating: ${mockDesignData.rating}`)).toBeInTheDocument();
        expect(screen.getByText(`(${mockDesignData.reviewsCount} reviews)`)).toBeInTheDocument();
      });

      mockDesignData.categories.forEach(category => {
        expect(screen.getByText(new RegExp(category, 'i'))).toBeInTheDocument();
      });

      mockDesignData.features.forEach(feature => {
        expect(screen.getByText(new RegExp(feature, 'i'))).toBeInTheDocument();
      });
    });

    it('should render all images with proper alt text', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        expect(images).toHaveLength(mockDesignData.images.length);

        mockDesignData.images.forEach((image, index) => {
          expect(images[index]).toHaveAttribute('src', image.url);
          expect(images[index]).toHaveAttribute('alt', image.alt);
        });
      });
    });

    it('should render related designs section', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      const relatedSection = await screen.findByRole('heading', { name: /related designs/i });
      expect(relatedSection).toBeInTheDocument();

      mockRelatedDesigns.forEach(design => {
        expect(screen.getByText(design.title)).toBeInTheDocument();
        expect(screen.getByAltText(new RegExp(design.title, 'i'))).toBeInTheDocument();
        expect(screen.getByText(`Rating: ${design.rating}`)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should allow image gallery navigation', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        expect(images[0]).toHaveClass('active');

        const nextButton = screen.getByLabelText(/next image/i);
        fireEvent.click(nextButton);
        expect(images[1]).toHaveClass('active');

        const prevButton = screen.getByLabelText(/previous image/i);
        fireEvent.click(prevButton);
        expect(images[0]).toHaveClass('active');
      });
    });

    it('should open image modal when clicking on an image', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        fireEvent.click(images[0]);

        const modal = await screen.findByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(within(modal).getByRole('img')).toHaveAttribute('src', mockDesignData.images[0].url);

        const closeButton = within(modal).getByLabelText(/close/i);
        fireEvent.click(closeButton);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should navigate to related design when clicked', async () => {
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const relatedDesigns = screen.getAllByText(/minimalist design|industrial style/i);
        fireEvent.click(relatedDesigns[0]);
        expect(mockNavigate).toHaveBeenCalledWith(`/designs/${mockRelatedDesigns[0].id}`);
      });
    });

    it('should toggle favorite status', async () => {
      (axios.post as jest.Mock).mockResolvedValue({});
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        expect(favoriteButton).toBeInTheDocument();

        fireEvent.click(favoriteButton);
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/favorites'),
            { designId: 'arch-1' }
          );
          expect(screen.getByLabelText(/remove from favorites/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByLabelText(/remove from favorites/i));
        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalledWith(
            expect.stringContaining(`/favorites/arch-1`)
          );
        });
      });
    });

    it('should handle favorite error gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to favorite'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        fireEvent.click(favoriteButton);

        const errorToast = await screen.findByText(/failed to update favorites/i);
        expect(errorToast).toBeInTheDocument();
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should have proper ARIA attributes for interactive elements', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/next image/i)).toHaveAttribute('aria-disabled', 'false');
        expect(screen.getByLabelText(/previous image/i)).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByLabelText(/add to favorites/i)).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const nextButton = screen.getByLabelText(/next image/i);
        const prevButton = screen.getByLabelText(/previous image/i);
        const favoriteButton = screen.getByLabelText(/add to favorites/i);

        // Test tab navigation
        fireEvent.keyDown(nextButton, { key: 'Tab', code: 'Tab' });
        expect(prevButton).toHaveFocus();

        fireEvent.keyDown(prevButton, { key: 'Tab', code: 'Tab', shiftKey: true });
        expect(nextButton).toHaveFocus();

        // Test space/enter activation
        fireEvent.keyDown(favoriteButton, { key: ' ', code: 'Space' });
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalled();
        });

        fireEvent.keyDown(favoriteButton, { key: 'Enter', code: 'Enter' });
        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalled();
        });
      });
    });

    it('should have proper heading structure', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(mockDesignData.title);
        expect(headings[0]).toHaveAttribute('aria-level', '1');

        expect(screen.getByRole('heading', { name: /features/i })).toHaveAttribute('aria-level', '2');
        expect(screen.getByRole('heading', { name: /related designs/i })).toHaveAttribute('aria-level', '2');
      });
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should track page view on component mount', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(mockAnalytics.trackPageView).toHaveBeenCalledWith(
          'Design Architecture',
          { designId: 'arch-1' }
        );
      });
    });

    it('should track image gallery interactions', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const nextButton = screen.getByLabelText(/next image/i);
        fireEvent.click(nextButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Image Navigation',
          { action: 'next', designId: 'arch-1' }
        );

        const prevButton = screen.getByLabelText(/previous image/i);
        fireEvent.click(prevButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Image Navigation',
          { action: 'previous', designId: 'arch-1' }
        );
      });
    });

    it('should track favorite actions', async () => {
      (axios.post as jest.Mock).mockResolvedValue({});

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        fireEvent.click(favoriteButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Favorite',
          { action: 'add', designId: 'arch-1' }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing design data gracefully', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      const errorMessage = await screen.findByText(/design not found/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should handle empty images array', async () => {
      const designWithoutImages = { ...mockDesignData, images: [] };
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: designWithoutImages })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no images available/i)).toBeInTheDocument();
        expect(screen.queryByRole('img', { name: /modern building/i })).not.toBeInTheDocument();
      });
    });

    it('should handle empty related designs array', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: [] });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no related designs found/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthenticated user for favorite functionality', async () => {
      (useAuth as jest.Mock).mockReturnValue({ ...mockAuth, isAuthenticated: false });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/sign in to save favorites/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/add to favorites/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should adjust layout for mobile view', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const mobileLayout = screen.getByTestId('mobile-layout');
        expect(mobileLayout).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument();
      });
    });

    it('should adjust layout for desktop view', async () => {
      // Mock desktop viewport
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const desktopLayout = screen.getByTestId('desktop-layout');
        expect(desktopLayout).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { DesignArchitecture } from './DesignArchitecture';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuth } from '../../context/AuthContext';

jest.mock('axios');
jest.mock('../../hooks/useAnalytics');
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const mockAnalytics = {
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
};

const mockAuth = {
  user: { id: '123', name: 'Test User' },
  isAuthenticated: true,
};

const mockDesignData = {
  id: 'arch-1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  categories: ['residential', 'commercial'],
  images: [
    { id: 'img-1', url: '/modern-1.jpg', alt: 'Modern building 1' },
    { id: 'img-2', url: '/modern-2.jpg', alt: 'Modern building 2' },
  ],
  features: ['sustainable', 'smart-home', 'open-space'],
  rating: 4.5,
  reviewsCount: 120,
  createdAt: '2023-01-15T10:00:00Z',
};

const mockRelatedDesigns = [
  {
    id: 'arch-2',
    title: 'Minimalist Design',
    thumbnail: '/minimalist.jpg',
    rating: 4.2,
  },
  {
    id: 'arch-3',
    title: 'Industrial Style',
    thumbnail: '/industrial.jpg',
    rating: 4.0,
  },
];

const renderComponent = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    (useAnalytics as jest.Mock).mockReturnValue(mockAnalytics);
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
    jest.clearAllMocks();
  });

  describe('Initial Render and Loading States', () => {
    it('should display loading skeleton while fetching data', async () => {
      (axios.get as jest.Mock)
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockImplementationOnce(() => new Promise(() => {}));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      expect(screen.getByTestId('design-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('related-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should display error message when data fetching fails', async () => {
      (axios.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      const errorMessages = await screen.findAllByTestId('error-message');
      expect(errorMessages).toHaveLength(2);
      expect(screen.queryByTestId('design-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Main Content Rendering', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should render all design information correctly', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(mockDesignData.title)).toBeInTheDocument();
        expect(screen.getByText(mockDesignData.description)).toBeInTheDocument();
        expect(screen.getByText(`Rating: ${mockDesignData.rating}`)).toBeInTheDocument();
        expect(screen.getByText(`(${mockDesignData.reviewsCount} reviews)`)).toBeInTheDocument();
      });

      mockDesignData.categories.forEach(category => {
        expect(screen.getByText(new RegExp(category, 'i'))).toBeInTheDocument();
      });

      mockDesignData.features.forEach(feature => {
        expect(screen.getByText(new RegExp(feature, 'i'))).toBeInTheDocument();
      });
    });

    it('should render all images with proper alt text', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        expect(images).toHaveLength(mockDesignData.images.length);

        mockDesignData.images.forEach((image, index) => {
          expect(images[index]).toHaveAttribute('src', image.url);
          expect(images[index]).toHaveAttribute('alt', image.alt);
        });
      });
    });

    it('should render related designs section', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      const relatedSection = await screen.findByRole('heading', { name: /related designs/i });
      expect(relatedSection).toBeInTheDocument();

      mockRelatedDesigns.forEach(design => {
        expect(screen.getByText(design.title)).toBeInTheDocument();
        expect(screen.getByAltText(new RegExp(design.title, 'i'))).toBeInTheDocument();
        expect(screen.getByText(`Rating: ${design.rating}`)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should allow image gallery navigation', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        expect(images[0]).toHaveClass('active');

        const nextButton = screen.getByLabelText(/next image/i);
        fireEvent.click(nextButton);
        expect(images[1]).toHaveClass('active');

        const prevButton = screen.getByLabelText(/previous image/i);
        fireEvent.click(prevButton);
        expect(images[0]).toHaveClass('active');
      });
    });

    it('should open image modal when clicking on an image', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const images = screen.getAllByRole('img', { name: /modern building/i });
        fireEvent.click(images[0]);

        const modal = await screen.findByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(within(modal).getByRole('img')).toHaveAttribute('src', mockDesignData.images[0].url);

        const closeButton = within(modal).getByLabelText(/close/i);
        fireEvent.click(closeButton);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should navigate to related design when clicked', async () => {
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const relatedDesigns = screen.getAllByText(/minimalist design|industrial style/i);
        fireEvent.click(relatedDesigns[0]);
        expect(mockNavigate).toHaveBeenCalledWith(`/designs/${mockRelatedDesigns[0].id}`);
      });
    });

    it('should toggle favorite status', async () => {
      (axios.post as jest.Mock).mockResolvedValue({});
      (axios.delete as jest.Mock).mockResolvedValue({});

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        expect(favoriteButton).toBeInTheDocument();

        fireEvent.click(favoriteButton);
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/favorites'),
            { designId: 'arch-1' }
          );
          expect(screen.getByLabelText(/remove from favorites/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByLabelText(/remove from favorites/i));
        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalledWith(
            expect.stringContaining(`/favorites/arch-1`)
          );
        });
      });
    });

    it('should handle favorite error gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Failed to favorite'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        fireEvent.click(favoriteButton);

        const errorToast = await screen.findByText(/failed to update favorites/i);
        expect(errorToast).toBeInTheDocument();
        expect(axios.post).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should have proper ARIA attributes for interactive elements', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/next image/i)).toHaveAttribute('aria-disabled', 'false');
        expect(screen.getByLabelText(/previous image/i)).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByLabelText(/add to favorites/i)).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('should be navigable via keyboard', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const nextButton = screen.getByLabelText(/next image/i);
        const prevButton = screen.getByLabelText(/previous image/i);
        const favoriteButton = screen.getByLabelText(/add to favorites/i);

        // Test tab navigation
        fireEvent.keyDown(nextButton, { key: 'Tab', code: 'Tab' });
        expect(prevButton).toHaveFocus();

        fireEvent.keyDown(prevButton, { key: 'Tab', code: 'Tab', shiftKey: true });
        expect(nextButton).toHaveFocus();

        // Test space/enter activation
        fireEvent.keyDown(favoriteButton, { key: ' ', code: 'Space' });
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalled();
        });

        fireEvent.keyDown(favoriteButton, { key: 'Enter', code: 'Enter' });
        await waitFor(() => {
          expect(axios.delete).toHaveBeenCalled();
        });
      });
    });

    it('should have proper heading structure', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(mockDesignData.title);
        expect(headings[0]).toHaveAttribute('aria-level', '1');

        expect(screen.getByRole('heading', { name: /features/i })).toHaveAttribute('aria-level', '2');
        expect(screen.getByRole('heading', { name: /related designs/i })).toHaveAttribute('aria-level', '2');
      });
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should track page view on component mount', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(mockAnalytics.trackPageView).toHaveBeenCalledWith(
          'Design Architecture',
          { designId: 'arch-1' }
        );
      });
    });

    it('should track image gallery interactions', async () => {
      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const nextButton = screen.getByLabelText(/next image/i);
        fireEvent.click(nextButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Image Navigation',
          { action: 'next', designId: 'arch-1' }
        );

        const prevButton = screen.getByLabelText(/previous image/i);
        fireEvent.click(prevButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Image Navigation',
          { action: 'previous', designId: 'arch-1' }
        );
      });
    });

    it('should track favorite actions', async () => {
      (axios.post as jest.Mock).mockResolvedValue({});

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(async () => {
        const favoriteButton = screen.getByLabelText(/add to favorites/i);
        fireEvent.click(favoriteButton);

        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          'Design Favorite',
          { action: 'add', designId: 'arch-1' }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing design data gracefully', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      const errorMessage = await screen.findByText(/design not found/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should handle empty images array', async () => {
      const designWithoutImages = { ...mockDesignData, images: [] };
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: designWithoutImages })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no images available/i)).toBeInTheDocument();
        expect(screen.queryByRole('img', { name: /modern building/i })).not.toBeInTheDocument();
      });
    });

    it('should handle empty related designs array', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: [] });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no related designs found/i)).toBeInTheDocument();
      });
    });

    it('should handle unauthenticated user for favorite functionality', async () => {
      (useAuth as jest.Mock).mockReturnValue({ ...mockAuth, isAuthenticated: false });

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        expect(screen.getByText(/sign in to save favorites/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/add to favorites/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockDesignData })
        .mockResolvedValueOnce({ data: mockRelatedDesigns });
    });

    it('should adjust layout for mobile view', async () => {
      // Mock mobile viewport
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const mobileLayout = screen.getByTestId('mobile-layout');
        expect(mobileLayout).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument();
      });
    });

    it('should adjust layout for desktop view', async () => {
      // Mock desktop viewport
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));

      renderComponent(<DesignArchitecture designId="arch-1" />);

      await waitFor(() => {
        const desktopLayout = screen.getByTestId('desktop-layout');
        expect(desktopLayout).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument();
      });
    });
  });
});