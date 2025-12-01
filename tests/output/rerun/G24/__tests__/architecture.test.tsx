import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture'; // Replace with the actual path
import * as api from '../api/designArchitectureApi'; // Replace with the actual path

// Mock the API module
jest.mock('../api/designArchitectureApi');

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

  it('fetches and displays design architecture data on successful API call', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform./i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeInTheDocument();
    });
  });

  it('displays an error message when API call fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching design architecture/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked after an error', async () => {
    (api.fetchDesignArchitecture as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch data'))
      .mockResolvedValueOnce({
        title: 'E-commerce Architecture',
        description: 'A sample architecture for an e-commerce platform.',
        diagramUrl: 'https://example.com/diagram.png',
      });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching design architecture/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture/i)).toBeInTheDocument();
    });
  });

  it('displays a default image if the diagram URL is invalid', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'invalid-url',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img', { name: /E-commerce Architecture Diagram/i });
      expect(image).toHaveAttribute('src', 'default-image.png'); // Replace with the actual default image path
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({});

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText(/E-commerce Architecture/i)).toBeNull();
      expect(screen.queryByText(/A sample architecture for an e-commerce platform./i)).toBeNull();
      expect(screen.queryByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeNull();
      expect(screen.getByText(/No design architecture data available/i)).toBeInTheDocument();
    });
  });

  it('provides a descriptive alt text for the diagram image', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img', { name: /E-commerce Architecture Diagram/i });
      expect(image).toHaveAttribute('alt', 'E-commerce Architecture Diagram');
    });
  });

  it('renders with accessible roles and labels', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /E-commerce Architecture/i })).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform./i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeInTheDocument();
    });
  });

  it('displays a message when the diagram URL is missing', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No diagram available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the description is missing', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the title is missing', async () => {
    const mockData = {
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No title available/i)).toBeInTheDocument();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable. This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable. This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable.';
    const mockData = {
      title: 'E-commerce Architecture',
      description: longDescription,
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('handles special characters in the title and description', async () => {
    const mockData = {
      title: 'E-commerce Architecture & Design',
      description: 'A sample architecture for an e-commerce platform with special characters like &, <, >, and "quotes".',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture & Design/i)).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform with special characters like &, <, >, and "quotes"./i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DesignArchitecture from '../components/DesignArchitecture'; // Replace with the actual path
import * as api from '../api/designArchitectureApi'; // Replace with the actual path

// Mock the API module
jest.mock('../api/designArchitectureApi');

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

  it('fetches and displays design architecture data on successful API call', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform./i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeInTheDocument();
    });
  });

  it('displays an error message when API call fails', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching design architecture/i)).toBeInTheDocument();
    });
  });

  it('retries fetching data when the retry button is clicked after an error', async () => {
    (api.fetchDesignArchitecture as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch data'))
      .mockResolvedValueOnce({
        title: 'E-commerce Architecture',
        description: 'A sample architecture for an e-commerce platform.',
        diagramUrl: 'https://example.com/diagram.png',
      });

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching design architecture/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture/i)).toBeInTheDocument();
    });
  });

  it('displays a default image if the diagram URL is invalid', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'invalid-url',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img', { name: /E-commerce Architecture Diagram/i });
      expect(image).toHaveAttribute('src', 'default-image.png'); // Replace with the actual default image path
    });
  });

  it('handles empty data gracefully', async () => {
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue({});

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText(/E-commerce Architecture/i)).toBeNull();
      expect(screen.queryByText(/A sample architecture for an e-commerce platform./i)).toBeNull();
      expect(screen.queryByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeNull();
      expect(screen.getByText(/No design architecture data available/i)).toBeInTheDocument();
    });
  });

  it('provides a descriptive alt text for the diagram image', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      const image = screen.getByRole('img', { name: /E-commerce Architecture Diagram/i });
      expect(image).toHaveAttribute('alt', 'E-commerce Architecture Diagram');
    });
  });

  it('renders with accessible roles and labels', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /E-commerce Architecture/i })).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform./i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /E-commerce Architecture Diagram/i })).toBeInTheDocument();
    });
  });

  it('displays a message when the diagram URL is missing', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      description: 'A sample architecture for an e-commerce platform.',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No diagram available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the description is missing', async () => {
    const mockData = {
      title: 'E-commerce Architecture',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available/i)).toBeInTheDocument();
    });
  });

  it('displays a message when the title is missing', async () => {
    const mockData = {
      description: 'A sample architecture for an e-commerce platform.',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No title available/i)).toBeInTheDocument();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable. This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable. This is a very long description that should wrap properly without breaking the layout.  It should handle multiple lines and still be readable.';
    const mockData = {
      title: 'E-commerce Architecture',
      description: longDescription,
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('handles special characters in the title and description', async () => {
    const mockData = {
      title: 'E-commerce Architecture & Design',
      description: 'A sample architecture for an e-commerce platform with special characters like &, <, >, and "quotes".',
      diagramUrl: 'https://example.com/diagram.png',
    };
    (api.fetchDesignArchitecture as jest.Mock).mockResolvedValue(mockData);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/E-commerce Architecture & Design/i)).toBeInTheDocument();
      expect(screen.getByText(/A sample architecture for an e-commerce platform with special characters like &, <, >, and "quotes"./i)).toBeInTheDocument();
    });
  });
});