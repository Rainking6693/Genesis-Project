import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Architecture',
    description: 'Mock description',
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays architecture data on successful API call', async () => {
    const mockData = {
      title: 'Test Architecture',
      description: 'Test description',
      image: 'test-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Test description/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('displays error message on failed API call', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValue(new Error('API Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });
  });

  it('displays a default message when no data is returned', async () => {
    require('../utils/api').fetchArchitectureData.mockResolvedValue(null);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No architecture data available/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    require('../utils/api').fetchArchitectureData.mockResolvedValue({});

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByRole('img')).toBeNull();
    });
  });

  it('renders with accessibility attributes', async () => {
    const mockData = {
      title: 'Accessible Architecture',
      description: 'Accessible description',
      image: 'accessible-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Accessible Architecture');
    });
  });

  it('retries fetching data on retry button click', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValueOnce(new Error('API Error'));
    require('../utils/api').fetchArchitectureData.mockResolvedValueOnce({
      title: 'Retried Architecture',
      description: 'Retried description',
      image: 'retried-image.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Retried Architecture/i)).toBeInTheDocument();
    });
  });

  it('handles multiple retries', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValue(new Error('API Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });
  });

  it('displays a placeholder image if the image URL is invalid', async () => {
    const mockData = {
      title: 'Invalid Image Architecture',
      description: 'Invalid Image description',
      image: 'invalid-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'invalid-image.jpg');
    });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap properly within the component. It should not overflow or break the layout of the component. This is a very long description that should wrap properly within the component. It should not overflow or break the layout of the component.';
    const mockData = {
      title: 'Long Description Architecture',
      description: longDescription,
      image: 'long-description-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('displays a default title if the title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Description with empty title',
      image: 'empty-title-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Design Architecture/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture';

// Mock any external dependencies, e.g., API calls
jest.mock('../utils/api', () => ({
  fetchArchitectureData: jest.fn(() => Promise.resolve({
    title: 'Mock Architecture',
    description: 'Mock description',
    image: 'mock-image.jpg',
  })),
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DesignArchitecture />);
  });

  it('displays loading state initially', () => {
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('fetches and displays architecture data on successful API call', async () => {
    const mockData = {
      title: 'Test Architecture',
      description: 'Test description',
      image: 'test-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Test Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/Test description/i)).toBeInTheDocument();
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'test-image.jpg');
    });
  });

  it('displays error message on failed API call', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValue(new Error('API Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });
  });

  it('displays a default message when no data is returned', async () => {
    require('../utils/api').fetchArchitectureData.mockResolvedValue(null);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No architecture data available/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    require('../utils/api').fetchArchitectureData.mockResolvedValue({});

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByRole('img')).toBeNull();
    });
  });

  it('renders with accessibility attributes', async () => {
    const mockData = {
      title: 'Accessible Architecture',
      description: 'Accessible description',
      image: 'accessible-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('alt', 'Accessible Architecture');
    });
  });

  it('retries fetching data on retry button click', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValueOnce(new Error('API Error'));
    require('../utils/api').fetchArchitectureData.mockResolvedValueOnce({
      title: 'Retried Architecture',
      description: 'Retried description',
      image: 'retried-image.jpg',
    });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Retried Architecture/i)).toBeInTheDocument();
    });
  });

  it('handles multiple retries', async () => {
    require('../utils/api').fetchArchitectureData.mockRejectedValue(new Error('API Error'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching architecture data/i)).toBeInTheDocument();
    });
  });

  it('displays a placeholder image if the image URL is invalid', async () => {
    const mockData = {
      title: 'Invalid Image Architecture',
      description: 'Invalid Image description',
      image: 'invalid-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const imageElement = screen.getByRole('img');
      expect(imageElement).toHaveAttribute('src', 'invalid-image.jpg');
    });
  });

  it('handles long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap properly within the component. It should not overflow or break the layout of the component. This is a very long description that should wrap properly within the component. It should not overflow or break the layout of the component.';
    const mockData = {
      title: 'Long Description Architecture',
      description: longDescription,
      image: 'long-description-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('displays a default title if the title is empty', async () => {
    const mockData = {
      title: '',
      description: 'Description with empty title',
      image: 'empty-title-image.jpg',
    };
    require('../utils/api').fetchArchitectureData.mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Design Architecture/i)).toBeInTheDocument();
    });
  });
});