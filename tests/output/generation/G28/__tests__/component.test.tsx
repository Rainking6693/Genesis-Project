import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25.00,
  imageUrl: 'test.jpg',
  inventory: 10,
};

const mockCartContextValue = {
  cart: [],
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  updateQuantity: jest.fn(),
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
  rest.post('/api/products/1/reviews', (req, res, ctx) => {
    return res(ctx.status(201));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('ProductDetails Component', () => {

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter initialEntries={['/products/1']}>
        <CartContext.Provider value={mockCartContextValue}>
          <Routes>
            <Route path="/products/:productId" element={ui} />
          </Routes>
        </CartContext.Provider>
      </MemoryRouter>
    );
  };

  it('should render loading state initially', () => {
    renderWithContext(<ProductDetails />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25.00/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if product loading fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading product details./i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);
    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('should disable "Add to Cart" button when inventory is zero', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('should display "Out of Stock" message when inventory is zero', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
  });

  it('should allow submitting a review', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if review submission fails', async () => {
    server.use(
      rest.post('/api/products/1/reviews', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting review./i)).toBeInTheDocument();
    });
  });

  it('should handle empty review fields', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Submit Review/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Comment is required/i)).toBeInTheDocument();
    });
  });

  it('should have accessible elements', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /Test Product/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comment:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
  });

  it('should display a success message after submitting a review and then clear it after 3 seconds', async () => {
    jest.useFakeTimers();

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Review submitted successfully!/i)).toBeNull();
    });

    jest.useRealTimers();
  });

  it('should display the product image', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toHaveAttribute('src', 'test.jpg');
  });

  it('should handle a missing product image gracefully', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, imageUrl: null }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
  });

  it('should display the correct price with currency formatting', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\$25.00/i)).toBeInTheDocument();
  });

  it('should handle very long product descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long product description. '.repeat(50);
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, description: longDescription }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const descriptionElement = screen.getByText(longDescription);
    expect(descriptionElement).toBeInTheDocument();
    // Add assertions to check the layout, e.g., that it doesn't overflow or break the page
  });

  it('should allow users to navigate back to the product listing page', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('link', { name: /Back to Products/i });
    expect(backButton).toBeInTheDocument();
    // You can simulate a click on the back button and assert the navigation, but it requires more setup with routing mocks.
  });

});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25.00,
  imageUrl: 'test.jpg',
  inventory: 10,
};

const mockCartContextValue = {
  cart: [],
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  updateQuantity: jest.fn(),
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.json(mockProduct));
  }),
  rest.post('/api/products/1/reviews', (req, res, ctx) => {
    return res(ctx.status(201));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe('ProductDetails Component', () => {

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter initialEntries={['/products/1']}>
        <CartContext.Provider value={mockCartContextValue}>
          <Routes>
            <Route path="/products/:productId" element={ui} />
          </Routes>
        </CartContext.Provider>
      </MemoryRouter>
    );
  };

  it('should render loading state initially', () => {
    renderWithContext(<ProductDetails />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25.00/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if product loading fails', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading product details./i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);
    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('should disable "Add to Cart" button when inventory is zero', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('should display "Out of Stock" message when inventory is zero', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, inventory: 0 }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
  });

  it('should allow submitting a review', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if review submission fails', async () => {
    server.use(
      rest.post('/api/products/1/reviews', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting review./i)).toBeInTheDocument();
    });
  });

  it('should handle empty review fields', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Submit Review/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Comment is required/i)).toBeInTheDocument();
    });
  });

  it('should have accessible elements', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /Test Product/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Test Product/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comment:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
  });

  it('should display a success message after submitting a review and then clear it after 3 seconds', async () => {
    jest.useFakeTimers();

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name:/i);
    const commentInput = screen.getByLabelText(/Comment:/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    userEvent.type(nameInput, 'John Doe');
    userEvent.type(commentInput, 'Great product!');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Review submitted successfully!/i)).toBeNull();
    });

    jest.useRealTimers();
  });

  it('should display the product image', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toHaveAttribute('src', 'test.jpg');
  });

  it('should handle a missing product image gracefully', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, imageUrl: null }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const productImage = screen.getByRole('img', { name: /Test Product/i });
    expect(productImage).toHaveAttribute('src', 'default-image.jpg'); // Replace with your default image path
  });

  it('should display the correct price with currency formatting', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\$25.00/i)).toBeInTheDocument();
  });

  it('should handle very long product descriptions without breaking the layout', async () => {
    const longDescription = 'This is a very long product description. '.repeat(50);
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.json({ ...mockProduct, description: longDescription }));
      })
    );

    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const descriptionElement = screen.getByText(longDescription);
    expect(descriptionElement).toBeInTheDocument();
    // Add assertions to check the layout, e.g., that it doesn't overflow or break the page
  });

  it('should allow users to navigate back to the product listing page', async () => {
    renderWithContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('link', { name: /Back to Products/i });
    expect(backButton).toBeInTheDocument();
    // You can simulate a click on the back button and assert the navigation, but it requires more setup with routing mocks.
  });

});