import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path
import { mockDesignArchitectureData } from './mocks/designArchitectureMocks'; // Create a mock data file
import * as api from '../api/designArchitectureApi'; // Adjust the import path
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
  });

  it('fetches and displays design architecture data on mount', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });
  });

  it('displays a loading state while fetching data', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays an error message if fetching data fails', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('renders all architecture components', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      mockDesignArchitectureData.components.forEach((component) => {
        expect(screen.getByText(component.name)).toBeInTheDocument();
        expect(screen.getByText(component.description)).toBeInTheDocument();
      });
    });
  });

  it('handles empty components array gracefully', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, components: [] });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText('No components available.')).toBeInTheDocument();
    });
  });

  it('renders a default message when description is empty', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: '' });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No description available.')).toBeInTheDocument();
    });
  });

  it('renders a default message when title is empty', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, title: '' });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No title available.')).toBeInTheDocument();
    });
  });

  it('passes accessibility checks', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const { container } = render(<DesignArchitecture />);

    await waitFor(async () => {
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap correctly and not break the layout. '.repeat(50);
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: longDescription });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('handles special characters in the title and description', async () => {
    const specialCharactersTitle = 'Title with special characters: !@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const specialCharactersDescription = 'Description with special characters: !@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, title: specialCharactersTitle, description: specialCharactersDescription });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(specialCharactersTitle)).toBeInTheDocument();
      expect(screen.getByText(specialCharactersDescription)).toBeInTheDocument();
    });
  });

  it('handles null or undefined values in the data', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({
      title: null,
      description: undefined,
      components: [
        { name: null, description: undefined },
        { name: 'Component 2', description: 'Description 2' },
      ],
    } as any);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No title available.')).toBeInTheDocument();
      expect(screen.getByText('No description available.')).toBeInTheDocument();
      expect(screen.getByText('No name available.')).toBeInTheDocument();
      expect(screen.getByText('Description 2')).toBeInTheDocument();
    });
  });
});

// mocks/designArchitectureMocks.ts
export const mockDesignArchitectureData = {
  title: 'Ecommerce Design Architecture',
  description: 'This is the design architecture for our ecommerce platform.',
  components: [
    {
      name: 'Frontend',
      description: 'Handles the user interface and user interactions.',
    },
    {
      name: 'Backend',
      description: 'Manages the server-side logic and data storage.',
    },
  ],
};

// api/designArchitectureApi.ts
export const fetchDesignArchitectureData = async () => {
  // This is a mock implementation.  In a real application, this would fetch data from an API.
  return Promise.resolve({
    title: 'Ecommerce Design Architecture',
    description: 'This is the design architecture for our ecommerce platform.',
    components: [
      {
        name: 'Frontend',
        description: 'Handles the user interface and user interactions.',
      },
      {
        name: 'Backend',
        description: 'Manages the server-side logic and data storage.',
      },
    ],
  });
};

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from '../components/DesignArchitecture'; // Adjust the import path
import { mockDesignArchitectureData } from './mocks/designArchitectureMocks'; // Create a mock data file
import * as api from '../api/designArchitectureApi'; // Adjust the import path
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

jest.mock('../api/designArchitectureApi');

describe('DesignArchitecture Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);
  });

  it('fetches and displays design architecture data on mount', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(mockDesignArchitectureData.title)).toBeInTheDocument();
      expect(screen.getByText(mockDesignArchitectureData.description)).toBeInTheDocument();
    });
  });

  it('displays a loading state while fetching data', () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<DesignArchitecture />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays an error message if fetching data fails', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockRejectedValue(new Error('Failed to fetch data'));
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('renders all architecture components', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    render(<DesignArchitecture />);

    await waitFor(() => {
      mockDesignArchitectureData.components.forEach((component) => {
        expect(screen.getByText(component.name)).toBeInTheDocument();
        expect(screen.getByText(component.description)).toBeInTheDocument();
      });
    });
  });

  it('handles empty components array gracefully', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, components: [] });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.queryByText('No components available.')).toBeInTheDocument();
    });
  });

  it('renders a default message when description is empty', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: '' });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No description available.')).toBeInTheDocument();
    });
  });

  it('renders a default message when title is empty', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, title: '' });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No title available.')).toBeInTheDocument();
    });
  });

  it('passes accessibility checks', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue(mockDesignArchitectureData);
    const { container } = render(<DesignArchitecture />);

    await waitFor(async () => {
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  it('handles very long descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long description that should wrap correctly and not break the layout. '.repeat(50);
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, description: longDescription });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('handles special characters in the title and description', async () => {
    const specialCharactersTitle = 'Title with special characters: !@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    const specialCharactersDescription = 'Description with special characters: !@#$%^&*()_+=-`~[]\{}|;\':",./<>?';
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({ ...mockDesignArchitectureData, title: specialCharactersTitle, description: specialCharactersDescription });
    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText(specialCharactersTitle)).toBeInTheDocument();
      expect(screen.getByText(specialCharactersDescription)).toBeInTheDocument();
    });
  });

  it('handles null or undefined values in the data', async () => {
    (api.fetchDesignArchitectureData as jest.Mock).mockResolvedValue({
      title: null,
      description: undefined,
      components: [
        { name: null, description: undefined },
        { name: 'Component 2', description: 'Description 2' },
      ],
    } as any);

    render(<DesignArchitecture />);

    await waitFor(() => {
      expect(screen.getByText('No title available.')).toBeInTheDocument();
      expect(screen.getByText('No description available.')).toBeInTheDocument();
      expect(screen.getByText('No name available.')).toBeInTheDocument();
      expect(screen.getByText('Description 2')).toBeInTheDocument();
    });
  });
});

// mocks/designArchitectureMocks.ts
export const mockDesignArchitectureData = {
  title: 'Ecommerce Design Architecture',
  description: 'This is the design architecture for our ecommerce platform.',
  components: [
    {
      name: 'Frontend',
      description: 'Handles the user interface and user interactions.',
    },
    {
      name: 'Backend',
      description: 'Manages the server-side logic and data storage.',
    },
  ],
};

// api/designArchitectureApi.ts
export const fetchDesignArchitectureData = async () => {
  // This is a mock implementation.  In a real application, this would fetch data from an API.
  return Promise.resolve({
    title: 'Ecommerce Design Architecture',
    description: 'This is the design architecture for our ecommerce platform.',
    components: [
      {
        name: 'Frontend',
        description: 'Handles the user interface and user interactions.',
      },
      {
        name: 'Backend',
        description: 'Manages the server-side logic and data storage.',
      },
    ],
  });
};