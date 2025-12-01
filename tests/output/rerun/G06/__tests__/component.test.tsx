import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed
import * as api from '../api'; // Mock API calls

jest.mock('../api');

describe('CoreFunctionality Component', () => {
  const mockData = {
    title: 'Core Feature Title',
    description: 'Core feature description.',
    imageUrl: 'https://example.com/image.jpg',
    buttonText: 'Learn More',
    linkUrl: '/learn-more',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(null);
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the component with data fetched successfully', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: mockData.buttonText })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: mockData.title })).toBeInTheDocument();
    });
  });

  it('handles error state when data fetching fails', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders default values when data is incomplete', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue({
      title: undefined,
      description: undefined,
      imageUrl: undefined,
      buttonText: undefined,
      linkUrl: undefined,
    });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Default Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Default Description/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Learn More/i })).toBeInTheDocument();
    });
  });

  it('navigates to the correct URL when the button is clicked', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const linkElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(linkElement).toHaveAttribute('href', mockData.linkUrl);
    });
  });

  it('renders the image with the correct alt text', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: mockData.title });
      expect(imageElement).toHaveAttribute('src', mockData.imageUrl);
      expect(imageElement).toHaveAttribute('alt', mockData.title);
    });
  });

  it('applies aria-label to the link for accessibility', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const linkElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(linkElement).toHaveAttribute('aria-label', `Learn more about ${mockData.title}`);
    });
  });

  it('displays a fallback image if the image URL is invalid', async () => {
    const invalidMockData = { ...mockData, imageUrl: 'invalid-url' };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(invalidMockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: invalidMockData.title });
      expect(imageElement).toHaveAttribute('src', 'fallback-image.jpg'); // Replace with your actual fallback image path
    });
  });

  it('handles a missing buttonText gracefully', async () => {
    const noButtonTextData = { ...mockData, buttonText: undefined };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(noButtonTextData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  it('handles a missing linkUrl gracefully', async () => {
    const noLinkUrlData = { ...mockData, linkUrl: undefined };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(noLinkUrlData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const buttonElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(buttonElement).toHaveAttribute('href', '#');
    });
  });

  it('renders with a custom className', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality className="custom-class" />);
    await waitFor(() => {
      expect(screen.getByText(mockData.title).closest('div')).toHaveClass('custom-class');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreFunctionality from '../components/CoreFunctionality'; // Adjust path as needed
import * as api from '../api'; // Mock API calls

jest.mock('../api');

describe('CoreFunctionality Component', () => {
  const mockData = {
    title: 'Core Feature Title',
    description: 'Core feature description.',
    imageUrl: 'https://example.com/image.jpg',
    buttonText: 'Learn More',
    linkUrl: '/learn-more',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with loading state', () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(null);
    render(<CoreFunctionality />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the component with data fetched successfully', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(mockData.title)).toBeInTheDocument();
      expect(screen.getByText(mockData.description)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: mockData.buttonText })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: mockData.title })).toBeInTheDocument();
    });
  });

  it('handles error state when data fetching fails', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('renders default values when data is incomplete', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue({
      title: undefined,
      description: undefined,
      imageUrl: undefined,
      buttonText: undefined,
      linkUrl: undefined,
    });
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/Default Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Default Description/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Learn More/i })).toBeInTheDocument();
    });
  });

  it('navigates to the correct URL when the button is clicked', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const linkElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(linkElement).toHaveAttribute('href', mockData.linkUrl);
    });
  });

  it('renders the image with the correct alt text', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: mockData.title });
      expect(imageElement).toHaveAttribute('src', mockData.imageUrl);
      expect(imageElement).toHaveAttribute('alt', mockData.title);
    });
  });

  it('applies aria-label to the link for accessibility', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const linkElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(linkElement).toHaveAttribute('aria-label', `Learn more about ${mockData.title}`);
    });
  });

  it('displays a fallback image if the image URL is invalid', async () => {
    const invalidMockData = { ...mockData, imageUrl: 'invalid-url' };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(invalidMockData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const imageElement = screen.getByRole('img', { name: invalidMockData.title });
      expect(imageElement).toHaveAttribute('src', 'fallback-image.jpg'); // Replace with your actual fallback image path
    });
  });

  it('handles a missing buttonText gracefully', async () => {
    const noButtonTextData = { ...mockData, buttonText: undefined };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(noButtonTextData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  it('handles a missing linkUrl gracefully', async () => {
    const noLinkUrlData = { ...mockData, linkUrl: undefined };
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(noLinkUrlData);
    render(<CoreFunctionality />);
    await waitFor(() => {
      const buttonElement = screen.getByRole('link', { name: mockData.buttonText });
      expect(buttonElement).toHaveAttribute('href', '#');
    });
  });

  it('renders with a custom className', async () => {
    (api.fetchCoreFunctionalityData as jest.Mock).mockResolvedValue(mockData);
    render(<CoreFunctionality className="custom-class" />);
    await waitFor(() => {
      expect(screen.getByText(mockData.title).closest('div')).toHaveClass('custom-class');
    });
  });
});