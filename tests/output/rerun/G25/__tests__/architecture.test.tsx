import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import { DesignArchitectureData } from '../types/DesignArchitectureData'; // Adjust path as needed

// Mock external dependencies (e.g., API calls)
const mockFetchDesignArchitecture = jest.fn();

jest.mock('../api/designArchitectureApi', () => ({ // Adjust path as needed
  fetchDesignArchitecture: mockFetchDesignArchitecture,
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetchDesignArchitecture.mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders error message when data fetching fails', async () => {
    mockFetchDesignArchitecture.mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('renders design architecture data successfully', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [
        {
          title: 'Section 1',
          content: 'Content for section 1',
        },
        {
          title: 'Section 2',
          content: 'Content for section 2',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture./i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 2/i)).toBeInTheDocument();
    });
  });

  it('renders "No data available" when data is null', async () => {
    mockFetchDesignArchitecture.mockResolvedValue(null);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('displays a default title if the title is missing from the data', async () => {
    const mockData: DesignArchitectureData = {
      title: '',
      description: 'This is a sample design architecture.',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Design Architecture/i)).toBeInTheDocument(); // Default title
    });
  });

  it('handles empty sections array gracefully', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture./i)).toBeInTheDocument();
    });
  });

  it('renders accessibility attributes', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [
        {
          title: 'Section 1',
          content: 'Content for section 1',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /Sample Architecture/i });
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders a fallback description if description is missing', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: '',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available./i)).toBeInTheDocument();
    });
  });

  it('handles special characters in the data correctly', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture & Design',
      description: 'This is a sample design architecture with special characters: < > & " \'',
      sections: [
        {
          title: 'Section 1 with < > & " \'',
          content: 'Content for section 1 with < > & " \'',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture & Design/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture with special characters: < > & " '/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1 with < > & " '/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 1 with < > & " '/i)).toBeInTheDocument();
    });
  });

  it('re-fetches data on prop change (if applicable - add props to DesignArchitecture)', async () => {
    const mockData1: DesignArchitectureData = {
      title: 'Architecture 1',
      description: 'Description 1',
      sections: [],
    };

    const mockData2: DesignArchitectureData = {
      title: 'Architecture 2',
      description: 'Description 2',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

    const { rerender } = render(<DesignArchitecture id={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument();
    });

    rerender(<DesignArchitecture id={2} />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture 2/i)).toBeInTheDocument();
    });

    expect(mockFetchDesignArchitecture).toHaveBeenCalledTimes(2);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust path as needed
import { DesignArchitectureData } from '../types/DesignArchitectureData'; // Adjust path as needed

// Mock external dependencies (e.g., API calls)
const mockFetchDesignArchitecture = jest.fn();

jest.mock('../api/designArchitectureApi', () => ({ // Adjust path as needed
  fetchDesignArchitecture: mockFetchDesignArchitecture,
}));

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetchDesignArchitecture.mockResolvedValue(null);
    render(<DesignArchitecture />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders error message when data fetching fails', async () => {
    mockFetchDesignArchitecture.mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('renders design architecture data successfully', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [
        {
          title: 'Section 1',
          content: 'Content for section 1',
        },
        {
          title: 'Section 2',
          content: 'Content for section 2',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture./i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 2/i)).toBeInTheDocument();
    });
  });

  it('renders "No data available" when data is null', async () => {
    mockFetchDesignArchitecture.mockResolvedValue(null);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    });
  });

  it('displays a default title if the title is missing from the data', async () => {
    const mockData: DesignArchitectureData = {
      title: '',
      description: 'This is a sample design architecture.',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Design Architecture/i)).toBeInTheDocument(); // Default title
    });
  });

  it('handles empty sections array gracefully', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture./i)).toBeInTheDocument();
    });
  });

  it('renders accessibility attributes', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: 'This is a sample design architecture.',
      sections: [
        {
          title: 'Section 1',
          content: 'Content for section 1',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: /Sample Architecture/i });
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders a fallback description if description is missing', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture',
      description: '',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/No description available./i)).toBeInTheDocument();
    });
  });

  it('handles special characters in the data correctly', async () => {
    const mockData: DesignArchitectureData = {
      title: 'Sample Architecture & Design',
      description: 'This is a sample design architecture with special characters: < > & " \'',
      sections: [
        {
          title: 'Section 1 with < > & " \'',
          content: 'Content for section 1 with < > & " \'',
        },
      ],
    };

    mockFetchDesignArchitecture.mockResolvedValue(mockData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(/Sample Architecture & Design/i)).toBeInTheDocument();
      expect(screen.getByText(/This is a sample design architecture with special characters: < > & " '/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1 with < > & " '/i)).toBeInTheDocument();
      expect(screen.getByText(/Content for section 1 with < > & " '/i)).toBeInTheDocument();
    });
  });

  it('re-fetches data on prop change (if applicable - add props to DesignArchitecture)', async () => {
    const mockData1: DesignArchitectureData = {
      title: 'Architecture 1',
      description: 'Description 1',
      sections: [],
    };

    const mockData2: DesignArchitectureData = {
      title: 'Architecture 2',
      description: 'Description 2',
      sections: [],
    };

    mockFetchDesignArchitecture.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

    const { rerender } = render(<DesignArchitecture id={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture 1/i)).toBeInTheDocument();
    });

    rerender(<DesignArchitecture id={2} />);

    await waitFor(() => {
      expect(screen.getByText(/Architecture 2/i)).toBeInTheDocument();
    });

    expect(mockFetchDesignArchitecture).toHaveBeenCalledTimes(2);
  });
});