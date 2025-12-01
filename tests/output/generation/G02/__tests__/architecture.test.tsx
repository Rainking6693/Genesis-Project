import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import DesignArchitecture from '@/components/DesignArchitecture';
import { DesignArchitectureProps } from '@/types/designArchitecture';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
}));

const mockData = {
  id: '1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  features: [
    { id: '1', name: 'Responsive Design', description: 'Works on all devices' },
    { id: '2', name: 'Accessibility', description: 'WCAG 2.1 compliant' },
  ],
  images: [
    { id: '1', url: '/image1.jpg', alt: 'Architecture example 1' },
    { id: '2', url: '/image2.jpg', alt: 'Architecture example 2' },
  ],
  cta: {
    text: 'Get Started',
    link: '/contact',
  },
};

const mockError = new Error('Failed to fetch data');

describe('DesignArchitecture Component', () => {
  const renderComponent = (props: Partial<DesignArchitectureProps> = {}) => {
    const defaultProps: DesignArchitectureProps = {
      initialData: null,
      onFavorite: jest.fn(),
      isFavorite: false,
      ...props,
    };
    return render(<DesignArchitecture {...defaultProps} />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when no initial data is provided', () => {
      renderComponent();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should render with provided initial data', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });

    it('should have proper aria attributes for accessibility', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByRole('heading', { name: mockData.title })).toHaveAttribute(
        'aria-level',
        '1'
      );
      expect(screen.getByText(mockData.description)).toHaveAttribute(
        'aria-label',
        'Architecture description'
      );
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data when initialData is not provided', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
      renderComponent();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(screen.getByText(mockData.title)).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(screen.getByText(/unable to load architecture data/i)).toBeInTheDocument();
      });
    });

    it('should show retry button when fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to CTA link when button is clicked', async () => {
      renderComponent({ initialData: mockData });
      const ctaButton = screen.getByRole('button', { name: mockData.cta.text });
      fireEvent.click(ctaButton);
      expect(mockPush).toHaveBeenCalledWith(mockData.cta.link);
    });

    it('should toggle favorite status when favorite button is clicked', async () => {
      const mockOnFavorite = jest.fn();
      renderComponent({ initialData: mockData, onFavorite: mockOnFavorite, isFavorite: false });

      const favoriteButton = screen.getByLabelText(/add to favorites/i);
      fireEvent.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledWith(true);
    });

    it('should show image gallery when image is clicked', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      await waitFor(() => {
        expect(screen.getByTestId('image-gallery-modal')).toBeInTheDocument();
      });
    });

    it('should close image gallery when close button is clicked', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      const closeButton = await screen.findByLabelText(/close gallery/i);
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('image-gallery-modal')).not.toBeInTheDocument();
      });
    });

    it('should navigate through gallery images using keyboard', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      const modal = await screen.findByTestId('image-gallery-modal');
      fireEvent.keyDown(modal, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByAltText(mockData.images[1].alt)).toBeInTheDocument();
      });
    });
  });

  describe('Feature List', () => {
    it('should expand feature description when clicked', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      fireEvent.click(feature);

      await waitFor(() => {
        expect(screen.getByText(mockData.features[0].description)).toBeInTheDocument();
      });
    });

    it('should collapse feature description when clicked again', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      fireEvent.click(feature);
      fireEvent.click(feature);

      await waitFor(() => {
        expect(screen.queryByText(mockData.features[0].description)).not.toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation for features', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      feature.focus();
      fireEvent.keyDown(feature, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(mockData.features[0].description)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper contrast ratios for text elements', () => {
      renderComponent({ initialData: mockData });
      const heading = screen.getByRole('heading', { name: mockData.title });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should have proper aria-labels for interactive elements', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/view architecture details/i)).toBeInTheDocument();
    });

    it('should be navigable using keyboard only', async () => {
      renderComponent({ initialData: mockData });
      const user = userEvent.setup();

      await user.tab();
      expect(screen.getByRole('heading', { name: mockData.title })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: mockData.cta.text })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/add to favorites/i)).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      renderComponent();
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features list gracefully', () => {
      const dataWithNoFeatures = { ...mockData, features: [] };
      renderComponent({ initialData: dataWithNoFeatures });
      expect(screen.getByText(/no features available/i)).toBeInTheDocument();
    });

    it('should handle empty images list gracefully', () => {
      const dataWithNoImages = { ...mockData, images: [] };
      renderComponent({ initialData: dataWithNoImages });
      expect(screen.getByText(/no images available/i)).toBeInTheDocument();
    });

    it('should handle very long descriptions with truncation', () => {
      const longDescription = 'a'.repeat(500);
      const dataWithLongDesc = { ...mockData, description: longDescription };
      renderComponent({ initialData: dataWithLongDesc });

      const descriptionElement = screen.getByText(longDescription);
      expect(descriptionElement).toHaveClass('truncate');
    });

    it('should show full description on expand', async () => {
      const longDescription = 'a'.repeat(500);
      const dataWithLongDesc = { ...mockData, description: longDescription };
      renderComponent({ initialData: dataWithLongDesc });

      const expandButton = screen.getByRole('button', { name: /read more/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(longDescription)).not.toHaveClass('truncate');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent({ initialData: mockData });

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('should adjust layout for desktop viewports', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      renderComponent({ initialData: mockData });

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useRouter } from 'next/router';
import DesignArchitecture from '@/components/DesignArchitecture';
import { DesignArchitectureProps } from '@/types/designArchitecture';

jest.mock('axios');
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockImplementation(() => ({
  push: mockPush,
}));

const mockData = {
  id: '1',
  title: 'Modern Architecture',
  description: 'Cutting-edge design solutions',
  features: [
    { id: '1', name: 'Responsive Design', description: 'Works on all devices' },
    { id: '2', name: 'Accessibility', description: 'WCAG 2.1 compliant' },
  ],
  images: [
    { id: '1', url: '/image1.jpg', alt: 'Architecture example 1' },
    { id: '2', url: '/image2.jpg', alt: 'Architecture example 2' },
  ],
  cta: {
    text: 'Get Started',
    link: '/contact',
  },
};

const mockError = new Error('Failed to fetch data');

describe('DesignArchitecture Component', () => {
  const renderComponent = (props: Partial<DesignArchitectureProps> = {}) => {
    const defaultProps: DesignArchitectureProps = {
      initialData: null,
      onFavorite: jest.fn(),
      isFavorite: false,
      ...props,
    };
    return render(<DesignArchitecture {...defaultProps} />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when no initial data is provided', () => {
      renderComponent();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should render with provided initial data', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
    });

    it('should have proper aria attributes for accessibility', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByRole('heading', { name: mockData.title })).toHaveAttribute(
        'aria-level',
        '1'
      );
      expect(screen.getByText(mockData.description)).toHaveAttribute(
        'aria-label',
        'Architecture description'
      );
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data when initialData is not provided', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: mockData });
      renderComponent();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(screen.getByText(mockData.title)).toBeInTheDocument();
      });
    });

    it('should handle fetch error gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
        expect(screen.getByText(/unable to load architecture data/i)).toBeInTheDocument();
      });
    });

    it('should show retry button when fetch fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockError);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to CTA link when button is clicked', async () => {
      renderComponent({ initialData: mockData });
      const ctaButton = screen.getByRole('button', { name: mockData.cta.text });
      fireEvent.click(ctaButton);
      expect(mockPush).toHaveBeenCalledWith(mockData.cta.link);
    });

    it('should toggle favorite status when favorite button is clicked', async () => {
      const mockOnFavorite = jest.fn();
      renderComponent({ initialData: mockData, onFavorite: mockOnFavorite, isFavorite: false });

      const favoriteButton = screen.getByLabelText(/add to favorites/i);
      fireEvent.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledWith(true);
    });

    it('should show image gallery when image is clicked', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      await waitFor(() => {
        expect(screen.getByTestId('image-gallery-modal')).toBeInTheDocument();
      });
    });

    it('should close image gallery when close button is clicked', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      const closeButton = await screen.findByLabelText(/close gallery/i);
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('image-gallery-modal')).not.toBeInTheDocument();
      });
    });

    it('should navigate through gallery images using keyboard', async () => {
      renderComponent({ initialData: mockData });
      const firstImage = screen.getByAltText(mockData.images[0].alt);
      fireEvent.click(firstImage);

      const modal = await screen.findByTestId('image-gallery-modal');
      fireEvent.keyDown(modal, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByAltText(mockData.images[1].alt)).toBeInTheDocument();
      });
    });
  });

  describe('Feature List', () => {
    it('should expand feature description when clicked', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      fireEvent.click(feature);

      await waitFor(() => {
        expect(screen.getByText(mockData.features[0].description)).toBeInTheDocument();
      });
    });

    it('should collapse feature description when clicked again', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      fireEvent.click(feature);
      fireEvent.click(feature);

      await waitFor(() => {
        expect(screen.queryByText(mockData.features[0].description)).not.toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation for features', async () => {
      renderComponent({ initialData: mockData });
      const feature = screen.getByText(mockData.features[0].name);
      feature.focus();
      fireEvent.keyDown(feature, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(mockData.features[0].description)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper contrast ratios for text elements', () => {
      renderComponent({ initialData: mockData });
      const heading = screen.getByRole('heading', { name: mockData.title });
      expect(heading).toHaveStyle('color: rgba(0, 0, 0, 0.87)');
    });

    it('should have proper aria-labels for interactive elements', () => {
      renderComponent({ initialData: mockData });
      expect(screen.getByLabelText(/add to favorites/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/view architecture details/i)).toBeInTheDocument();
    });

    it('should be navigable using keyboard only', async () => {
      renderComponent({ initialData: mockData });
      const user = userEvent.setup();

      await user.tab();
      expect(screen.getByRole('heading', { name: mockData.title })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: mockData.cta.text })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/add to favorites/i)).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      renderComponent();
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty features list gracefully', () => {
      const dataWithNoFeatures = { ...mockData, features: [] };
      renderComponent({ initialData: dataWithNoFeatures });
      expect(screen.getByText(/no features available/i)).toBeInTheDocument();
    });

    it('should handle empty images list gracefully', () => {
      const dataWithNoImages = { ...mockData, images: [] };
      renderComponent({ initialData: dataWithNoImages });
      expect(screen.getByText(/no images available/i)).toBeInTheDocument();
    });

    it('should handle very long descriptions with truncation', () => {
      const longDescription = 'a'.repeat(500);
      const dataWithLongDesc = { ...mockData, description: longDescription };
      renderComponent({ initialData: dataWithLongDesc });

      const descriptionElement = screen.getByText(longDescription);
      expect(descriptionElement).toHaveClass('truncate');
    });

    it('should show full description on expand', async () => {
      const longDescription = 'a'.repeat(500);
      const dataWithLongDesc = { ...mockData, description: longDescription };
      renderComponent({ initialData: dataWithLongDesc });

      const expandButton = screen.getByRole('button', { name: /read more/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(longDescription)).not.toHaveClass('truncate');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      renderComponent({ initialData: mockData });

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('should adjust layout for desktop viewports', () => {
      global.innerWidth = 1200;
      global.dispatchEvent(new Event('resize'));
      renderComponent({ initialData: mockData });

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });
  });
});