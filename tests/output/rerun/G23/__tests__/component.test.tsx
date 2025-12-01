import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed
import CoreFunctionality from '../../components/CoreFunctionality'; // Adjust path as needed
import '@testing-library/jest-dom';

const mockProducts: Product[] = [
  { id: 1, name: 'Product 1', price: 10, imageUrl: 'url1', description: 'Desc 1', quantity: 10 },
  { id: 2, name: 'Product 2', price: 20, imageUrl: 'url2', description: 'Desc 2', quantity: 5 },
];

const server = setupServer(
  rest.get('/api/products', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProducts));
  }),
  rest.post('/api/checkout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Checkout successful' }));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cartItems: { [productId: number]: number } = {}) => {
  return render(
    <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), clearCart: jest.fn() }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  it('should render loading state initially', () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.delay(100), ctx.status(200), ctx.json(mockProducts));
      })
    );
    renderWithCartContext(<CoreFunctionality />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render products after loading', async () => {
    renderWithCartContext(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2/i)).toBeInTheDocument();
    });
  });

  it('should display an error message when fetching products fails', async () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    renderWithCartContext(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/error fetching products/i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });

  it('should call removeFromCart when "Remove from Cart" button is clicked', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = { 1: 1 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const removeFromCartButton = screen.getByRole('button', { name: /remove from cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should call clearCart when "Clear Cart" button is clicked', async () => {
    const clearCartMock = jest.fn();
    const cartItems = { 1: 1, 2: 1 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), clearCart: clearCartMock }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2/i)).toBeInTheDocument();
    });

    const clearCartButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(clearCartButton);
    expect(clearCartMock).toHaveBeenCalled();
  });

  it('should display cart items correctly', async () => {
    const cartItems = { 1: 2, 2: 1 };
    renderWithCartContext(<CoreFunctionality />, cartItems);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2 - quantity: 1/i)).toBeInTheDocument();
    });
  });

  it('should display "Cart is empty" message when cart is empty', async () => {
    renderWithCartContext(<CoreFunctionality />, {});

    await waitFor(() => {
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });
  });

  it('should handle checkout successfully', async () => {
    renderWithCartContext(<CoreFunctionality />, { 1: 1 });

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText(/checkout successful/i)).toBeInTheDocument();
    });
  });

  it('should handle checkout failure', async () => {
    server.use(
      rest.post('/api/checkout', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ success: false, message: 'Checkout failed' }));
      })
    );

    renderWithCartContext(<CoreFunctionality />, { 1: 1 });

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText(/checkout failed/i)).toBeInTheDocument();
    });
  });

  it('should display product details when product name is clicked', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const productNameLink = screen.getByRole('link', { name: /product 1/i });
    fireEvent.click(productNameLink);

    await waitFor(() => {
      expect(screen.getByText(/desc 1/i)).toBeInTheDocument();
    });
  });

  it('should have accessible labels and roles', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();

    const productNameLink = screen.getByRole('link', { name: /product 1/i });
    expect(productNameLink).toBeInTheDocument();
  });

  it('should handle adding multiple items to cart', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledTimes(2);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });

  it('should handle removing items from cart when quantity is greater than 1', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = { 1: 2 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 2/i)).toBeInTheDocument();
    });

    const removeFromCartButton = screen.getByRole('button', { name: /remove from cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should not allow checkout when cart is empty', async () => {
    renderWithCartContext(<CoreFunctionality />, {});

    await waitFor(() => {
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    expect(checkoutButton).toBeDisabled();
  });

  it('should display correct quantity after adding and removing items', async () => {
    const cartItems = { 1: 1 };
    renderWithCartContext(<CoreFunctionality />, cartItems);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 1/i)).toBeInTheDocument();
    });
  });

  it('should display correct price for each product', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - \$10/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2 - \$20/i)).toBeInTheDocument();
    });
  });

  it('should handle zero quantity products', async () => {
    const mockProductsWithZeroQuantity: Product[] = [
      { id: 3, name: 'Product 3', price: 30, imageUrl: 'url3', description: 'Desc 3', quantity: 0 },
    ];

    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockProductsWithZeroQuantity));
      })
    );

    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 3/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.queryByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeNull();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('should display a message when there are no products', async () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/no products available/i)).toBeInTheDocument();
    });
  });

  it('should handle adding item to cart when quantity is 1', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledTimes(1);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CartContext } from '../../contexts/CartContext'; // Adjust path as needed
import { Product } from '../../types/Product'; // Adjust path as needed
import CoreFunctionality from '../../components/CoreFunctionality'; // Adjust path as needed
import '@testing-library/jest-dom';

const mockProducts: Product[] = [
  { id: 1, name: 'Product 1', price: 10, imageUrl: 'url1', description: 'Desc 1', quantity: 10 },
  { id: 2, name: 'Product 2', price: 20, imageUrl: 'url2', description: 'Desc 2', quantity: 5 },
];

const server = setupServer(
  rest.get('/api/products', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockProducts));
  }),
  rest.post('/api/checkout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true, message: 'Checkout successful' }));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithCartContext = (ui: React.ReactElement, cartItems: { [productId: number]: number } = {}) => {
  return render(
    <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), clearCart: jest.fn() }}>
      {ui}
    </CartContext.Provider>
  );
};

describe('CoreFunctionality Component', () => {
  it('should render loading state initially', () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.delay(100), ctx.status(200), ctx.json(mockProducts));
      })
    );
    renderWithCartContext(<CoreFunctionality />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render products after loading', async () => {
    renderWithCartContext(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2/i)).toBeInTheDocument();
    });
  });

  it('should display an error message when fetching products fails', async () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    renderWithCartContext(<CoreFunctionality />);
    await waitFor(() => {
      expect(screen.getByText(/error fetching products/i)).toBeInTheDocument();
    });
  });

  it('should call addToCart when "Add to Cart" button is clicked', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });

  it('should call removeFromCart when "Remove from Cart" button is clicked', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = { 1: 1 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const removeFromCartButton = screen.getByRole('button', { name: /remove from cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should call clearCart when "Clear Cart" button is clicked', async () => {
    const clearCartMock = jest.fn();
    const cartItems = { 1: 1, 2: 1 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: jest.fn(), clearCart: clearCartMock }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2/i)).toBeInTheDocument();
    });

    const clearCartButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(clearCartButton);
    expect(clearCartMock).toHaveBeenCalled();
  });

  it('should display cart items correctly', async () => {
    const cartItems = { 1: 2, 2: 1 };
    renderWithCartContext(<CoreFunctionality />, cartItems);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2 - quantity: 1/i)).toBeInTheDocument();
    });
  });

  it('should display "Cart is empty" message when cart is empty', async () => {
    renderWithCartContext(<CoreFunctionality />, {});

    await waitFor(() => {
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });
  });

  it('should handle checkout successfully', async () => {
    renderWithCartContext(<CoreFunctionality />, { 1: 1 });

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText(/checkout successful/i)).toBeInTheDocument();
    });
  });

  it('should handle checkout failure', async () => {
    server.use(
      rest.post('/api/checkout', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ success: false, message: 'Checkout failed' }));
      })
    );

    renderWithCartContext(<CoreFunctionality />, { 1: 1 });

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText(/checkout failed/i)).toBeInTheDocument();
    });
  });

  it('should display product details when product name is clicked', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const productNameLink = screen.getByRole('link', { name: /product 1/i });
    fireEvent.click(productNameLink);

    await waitFor(() => {
      expect(screen.getByText(/desc 1/i)).toBeInTheDocument();
    });
  });

  it('should have accessible labels and roles', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();

    const productNameLink = screen.getByRole('link', { name: /product 1/i });
    expect(productNameLink).toBeInTheDocument();
  });

  it('should handle adding multiple items to cart', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledTimes(2);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });

  it('should handle removing items from cart when quantity is greater than 1', async () => {
    const removeFromCartMock = jest.fn();
    const cartItems = { 1: 2 };
    render(
      <CartContext.Provider value={{ cartItems, addToCart: jest.fn(), removeFromCart: removeFromCartMock, clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 2/i)).toBeInTheDocument();
    });

    const removeFromCartButton = screen.getByRole('button', { name: /remove from cart/i });
    fireEvent.click(removeFromCartButton);
    expect(removeFromCartMock).toHaveBeenCalledWith(1);
  });

  it('should not allow checkout when cart is empty', async () => {
    renderWithCartContext(<CoreFunctionality />, {});

    await waitFor(() => {
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    expect(checkoutButton).toBeDisabled();
  });

  it('should display correct quantity after adding and removing items', async () => {
    const cartItems = { 1: 1 };
    renderWithCartContext(<CoreFunctionality />, cartItems);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - quantity: 1/i)).toBeInTheDocument();
    });
  });

  it('should display correct price for each product', async () => {
    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 1 - \$10/i)).toBeInTheDocument();
      expect(screen.getByText(/product 2 - \$20/i)).toBeInTheDocument();
    });
  });

  it('should handle zero quantity products', async () => {
    const mockProductsWithZeroQuantity: Product[] = [
      { id: 3, name: 'Product 3', price: 30, imageUrl: 'url3', description: 'Desc 3', quantity: 0 },
    ];

    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockProductsWithZeroQuantity));
      })
    );

    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/product 3/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.queryByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeNull();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('should display a message when there are no products', async () => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    renderWithCartContext(<CoreFunctionality />);

    await waitFor(() => {
      expect(screen.getByText(/no products available/i)).toBeInTheDocument();
    });
  });

  it('should handle adding item to cart when quantity is 1', async () => {
    const addToCartMock = jest.fn();
    render(
      <CartContext.Provider value={{ cartItems: {}, addToCart: addToCartMock, removeFromCart: jest.fn(), clearCart: jest.fn() }}>
        <CoreFunctionality />
      </CartContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(addToCartMock).toHaveBeenCalledTimes(1);
    expect(addToCartMock).toHaveBeenCalledWith(1);
  });
});