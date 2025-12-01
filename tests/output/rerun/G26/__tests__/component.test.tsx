import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25.99,
  imageUrl: 'test-image.jpg',
  stock: 10,
};

const mockCartContextValue = {
  cart: [],
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
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
  const renderWithRouterAndContext = (ui: React.ReactElement) => {
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
    renderWithRouterAndContext(<ProductDetails />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25.99/i)).toBeInTheDocument();
    });
  });

  it('should handle product not found error', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Product not found/i)).toBeInTheDocument();
    });
  });

  it('should handle server error', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching product details/i)).toBeInTheDocument();
    });
  });

  it('should add product to cart when "Add to Cart" button is clicked', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('should display "Out of Stock" message when stock is 0', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, stock: 0 }));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add to Cart/i })).toBeNull();
    });
  });

  it('should display quantity input when stock is greater than 0', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toBeInTheDocument();
  });

  it('should update quantity in cart when quantity input changes', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
  });

  it('should not allow quantity to exceed stock', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15'); // Exceeds stock of 10
    });

    expect(quantityInput).toHaveValue(10);
  });

  it('should have accessible image with alt text', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const image = screen.getByRole('img', { name: /Test Product/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'test-image.jpg');
    expect(image).toHaveAttribute('alt', 'Test Product');
  });

  it('should submit a review successfully', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    const commentInput = screen.getByLabelText(/Comment/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    await act(async () => {
      userEvent.type(nameInput, 'John Doe');
      userEvent.type(commentInput, 'Great product!');
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('should handle review submission error', async () => {
    server.use(
      rest.post('/api/products/1/reviews', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    const commentInput = screen.getByLabelText(/Comment/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    await act(async () => {
      userEvent.type(nameInput, 'John Doe');
      userEvent.type(commentInput, 'Great product!');
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting review/i)).toBeInTheDocument();
    });
  });

  it('should display validation errors for review form', async () => {
    renderWithRouterAndContext(<ProductDetails />);
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
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../context/CartContext'; // Adjust path as needed
import ProductDetails from '../../components/ProductDetails'; // Adjust path as needed
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 25.99,
  imageUrl: 'test-image.jpg',
  stock: 10,
};

const mockCartContextValue = {
  cart: [],
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

const server = setupServer(
  rest.get('/api/products/1', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProduct));
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
  const renderWithRouterAndContext = (ui: React.ReactElement) => {
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
    renderWithRouterAndContext(<ProductDetails />);
    expect(screen.getByText(/Loading product details.../i)).toBeInTheDocument();
  });

  it('should render product details after loading', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Description/i)).toBeInTheDocument();
      expect(screen.getByText(/\$25.99/i)).toBeInTheDocument();
    });
  });

  it('should handle product not found error', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Product not found/i)).toBeInTheDocument();
    });
  });

  it('should handle server error', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching product details/i)).toBeInTheDocument();
    });
  });

  it('should add product to cart when "Add to Cart" button is clicked', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('should display "Out of Stock" message when stock is 0', async () => {
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ ...mockProduct, stock: 0 }));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add to Cart/i })).toBeNull();
    });
  });

  it('should display quantity input when stock is greater than 0', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    expect(quantityInput).toBeInTheDocument();
  });

  it('should update quantity in cart when quantity input changes', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '3');
    });

    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockCartContextValue.addToCart).toHaveBeenCalledWith({ ...mockProduct, quantity: 3 });
  });

  it('should not allow quantity to exceed stock', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/i });
    await act(async () => {
      userEvent.clear(quantityInput);
      userEvent.type(quantityInput, '15'); // Exceeds stock of 10
    });

    expect(quantityInput).toHaveValue(10);
  });

  it('should have accessible image with alt text', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const image = screen.getByRole('img', { name: /Test Product/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'test-image.jpg');
    expect(image).toHaveAttribute('alt', 'Test Product');
  });

  it('should submit a review successfully', async () => {
    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    const commentInput = screen.getByLabelText(/Comment/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    await act(async () => {
      userEvent.type(nameInput, 'John Doe');
      userEvent.type(commentInput, 'Great product!');
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Review submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('should handle review submission error', async () => {
    server.use(
      rest.post('/api/products/1/reviews', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithRouterAndContext(<ProductDetails />);
    await waitFor(() => {
      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    const commentInput = screen.getByLabelText(/Comment/i);
    const submitButton = screen.getByRole('button', { name: /Submit Review/i });

    await act(async () => {
      userEvent.type(nameInput, 'John Doe');
      userEvent.type(commentInput, 'Great product!');
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Error submitting review/i)).toBeInTheDocument();
    });
  });

  it('should display validation errors for review form', async () => {
    renderWithRouterAndContext(<ProductDetails />);
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
});