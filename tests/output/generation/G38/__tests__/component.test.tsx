import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

expect.extend(toHaveNoViolations);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const server = setupServer(
  rest.post('/api/data', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: [{ id: 1, name: 'Test Item' }] }));
  }),
  rest.get('/api/data/error', (req, res, ctx) => {
    return res(ctx.status(500));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  jest.clearAllMocks();
});
afterAll(() => server.close());

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '1', role: 'admin' }, isAuthenticated: true },
    notificationValue = { showNotification: jest.fn() },
    route = '/',
  } = {}
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <NotificationContext.Provider value={notificationValue}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/success" element={<div>Success Page</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('CoreFunctionality Component', () => {
  describe('Basic Rendering', () => {
    it('should render the main component with all required elements', () => {
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('heading', { name: /core functionality/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<CoreFunctionality />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('User Interactions', () => {
    it('should allow users to input data and submit the form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Test Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/success');
      });
    });

    it('should validate input before submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(await screen.findByText(/please enter valid input/i)).toBeInTheDocument();
    });

    it('should handle dropdown selection changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const dropdown = screen.getByRole('combobox');
      await user.click(dropdown);

      const options = await screen.findAllByRole('option');
      await user.click(options[1]);

      expect(dropdown).toHaveValue('option2');
    });

    it('should filter data based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'test');

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(2); // header + 1 result
      });
    });
  });

  describe('Data Fetching', () => {
    it('should display loading state while fetching data', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.json({ data: [{ id: 1, name: 'Test Item' }] })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should display error message when data fetching fails', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data',
          })
        );
      });
    });

    it('should display empty state when no data is available', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(ctx.json({ data: [] }));
        })
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error notification when submission fails', async () => {
      server.use(
        rest.post('/api/data', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ message: 'Validation error' }));
        })
      );

      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Invalid Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Validation error',
          })
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        rest.post('/api/data', (req, res, ctx) => {
          return res.networkError('Failed to connect');
        })
      );

      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Test Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error',
          })
        );
      });
    });
  });

  describe('Authentication States', () => {
    it('should disable submit button when user is not authenticated', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false },
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show login prompt when unauthenticated user tries to submit', async () => {
      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false },
        notificationValue,
      });

      const input = screen.getByRole('textbox', { name: /input/i });
      await user.type(input, 'Test Input');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(notificationValue.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Please log in to continue',
        })
      );
    });

    it('should show role-specific features for admin users', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', role: 'admin' }, isAuthenticated: true },
      });

      expect(screen.getByRole('button', { name: /admin action/i })).toBeInTheDocument();
    });

    it('should hide admin features for non-admin users', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', role: 'user' }, isAuthenticated: true },
      });

      expect(screen.queryByRole('button', { name: /admin action/i })).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when multiple pages exist', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.json({
              data: Array(15).fill({ id: 1, name: 'Test Item' }),
              total: 25,
              page: 1,
              pageSize: 10,
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
      });
    });

    it('should fetch new data when changing pages', async () => {
      const user = userEvent.setup();
      let page = 1;

      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          page = Number(req.url.searchParams.get('page')) || 1;
          return res(
            ctx.json({
              data: [{ id: page, name: `Item ${page}` }],
              total: 20,
              page,
              pageSize: 10,
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      const nextButton = await screen.findByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/item 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through form elements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const dropdown = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(dropdown).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should submit form when Enter is pressed in the input field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      await user.type(input, 'Test Input{enter}');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/success');
      });
    });

    it('should open dropdown when Down arrow is pressed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const dropdown = screen.getByRole('combobox');
      await user.click(dropdown);
      await user.keyboard('{ArrowDown}');

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input without breaking layout', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const longText = 'a'.repeat(1000);
      await user.type(input, longText);

      expect(input).toHaveValue(longText);
      expect(screen.getByText(longText)).toHaveClass('truncate');
    });

    it('should prevent XSS attacks in rendered content', () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.json({
              data: [{ id: 1, name: '<script>alert("xss")</script>' }],
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.queryByText(/alert\("xss"\)/i)).not.toBeInTheDocument();
      expect(screen.getByText(/&lt;script&gt;alert\("xss"\)&lt;\/script&gt;/i)).toBeInTheDocument();
    });

    it('should handle concurrent requests properly', async () => {
      let requestCount = 0;
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          requestCount++;
          return res(
            ctx.delay(requestCount * 100),
            ctx.json({ data: [{ id: requestCount, name: `Item ${requestCount}` }] })
          );
        })
      );

      const { rerender } = renderWithProviders(<CoreFunctionality />);

      // Simulate rapid state changes that might trigger multiple requests
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText(/item 3/i)).toBeInTheDocument();
      });
      expect(requestCount).toBe(3);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import CoreFunctionality from './CoreFunctionality';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';

expect.extend(toHaveNoViolations);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const server = setupServer(
  rest.post('/api/data', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: [{ id: 1, name: 'Test Item' }] }));
  }),
  rest.get('/api/data/error', (req, res, ctx) => {
    return res(ctx.status(500));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  jest.clearAllMocks();
});
afterAll(() => server.close());

const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = { user: { id: '1', role: 'admin' }, isAuthenticated: true },
    notificationValue = { showNotification: jest.fn() },
    route = '/',
  } = {}
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <NotificationContext.Provider value={notificationValue}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/" element={ui} />
              <Route path="/success" element={<div>Success Page</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('CoreFunctionality Component', () => {
  describe('Basic Rendering', () => {
    it('should render the main component with all required elements', () => {
      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('heading', { name: /core functionality/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<CoreFunctionality />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('User Interactions', () => {
    it('should allow users to input data and submit the form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Test Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/success');
      });
    });

    it('should validate input before submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(await screen.findByText(/please enter valid input/i)).toBeInTheDocument();
    });

    it('should handle dropdown selection changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const dropdown = screen.getByRole('combobox');
      await user.click(dropdown);

      const options = await screen.findAllByRole('option');
      await user.click(options[1]);

      expect(dropdown).toHaveValue('option2');
    });

    it('should filter data based on search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'test');

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(2); // header + 1 result
      });
    });
  });

  describe('Data Fetching', () => {
    it('should display loading state while fetching data', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.json({ data: [{ id: 1, name: 'Test Item' }] })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('should display error message when data fetching fails', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Failed to load data',
          })
        );
      });
    });

    it('should display empty state when no data is available', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(ctx.json({ data: [] }));
        })
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error notification when submission fails', async () => {
      server.use(
        rest.post('/api/data', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ message: 'Validation error' }));
        })
      );

      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Invalid Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Validation error',
          })
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        rest.post('/api/data', (req, res, ctx) => {
          return res.networkError('Failed to connect');
        })
      );

      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, { notificationValue });

      const input = screen.getByRole('textbox', { name: /input/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'Test Input');
      await user.click(submitButton);

      await waitFor(() => {
        expect(notificationValue.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: 'Network error',
          })
        );
      });
    });
  });

  describe('Authentication States', () => {
    it('should disable submit button when user is not authenticated', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false },
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show login prompt when unauthenticated user tries to submit', async () => {
      const user = userEvent.setup();
      const notificationValue = { showNotification: jest.fn() };
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: null, isAuthenticated: false },
        notificationValue,
      });

      const input = screen.getByRole('textbox', { name: /input/i });
      await user.type(input, 'Test Input');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(notificationValue.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'Please log in to continue',
        })
      );
    });

    it('should show role-specific features for admin users', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', role: 'admin' }, isAuthenticated: true },
      });

      expect(screen.getByRole('button', { name: /admin action/i })).toBeInTheDocument();
    });

    it('should hide admin features for non-admin users', () => {
      renderWithProviders(<CoreFunctionality />, {
        authValue: { user: { id: '1', role: 'user' }, isAuthenticated: true },
      });

      expect(screen.queryByRole('button', { name: /admin action/i })).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls when multiple pages exist', async () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.json({
              data: Array(15).fill({ id: 1, name: 'Test Item' }),
              total: 25,
              page: 1,
              pageSize: 10,
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
      });
    });

    it('should fetch new data when changing pages', async () => {
      const user = userEvent.setup();
      let page = 1;

      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          page = Number(req.url.searchParams.get('page')) || 1;
          return res(
            ctx.json({
              data: [{ id: page, name: `Item ${page}` }],
              total: 20,
              page,
              pageSize: 10,
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      const nextButton = await screen.findByRole('button', { name: /next page/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/item 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through form elements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const dropdown = screen.getByRole('combobox');
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(dropdown).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should submit form when Enter is pressed in the input field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      await user.type(input, 'Test Input{enter}');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/success');
      });
    });

    it('should open dropdown when Down arrow is pressed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const dropdown = screen.getByRole('combobox');
      await user.click(dropdown);
      await user.keyboard('{ArrowDown}');

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input without breaking layout', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CoreFunctionality />);

      const input = screen.getByRole('textbox', { name: /input/i });
      const longText = 'a'.repeat(1000);
      await user.type(input, longText);

      expect(input).toHaveValue(longText);
      expect(screen.getByText(longText)).toHaveClass('truncate');
    });

    it('should prevent XSS attacks in rendered content', () => {
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          return res(
            ctx.json({
              data: [{ id: 1, name: '<script>alert("xss")</script>' }],
            })
          );
        })
      );

      renderWithProviders(<CoreFunctionality />);

      expect(screen.queryByText(/alert\("xss"\)/i)).not.toBeInTheDocument();
      expect(screen.getByText(/&lt;script&gt;alert\("xss"\)&lt;\/script&gt;/i)).toBeInTheDocument();
    });

    it('should handle concurrent requests properly', async () => {
      let requestCount = 0;
      server.use(
        rest.get('/api/data', (req, res, ctx) => {
          requestCount++;
          return res(
            ctx.delay(requestCount * 100),
            ctx.json({ data: [{ id: requestCount, name: `Item ${requestCount}` }] })
          );
        })
      );

      const { rerender } = renderWithProviders(<CoreFunctionality />);

      // Simulate rapid state changes that might trigger multiple requests
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText(/item 3/i)).toBeInTheDocument();
      });
      expect(requestCount).toBe(3);
    });
  });
});