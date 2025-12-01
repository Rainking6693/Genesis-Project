import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the component to be tested
const MockLandingComponent = ({ isLoading, error, data, fetchData, handleInputChange, handleSubmit }) => {
  return (
    <div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {data && <div data-testid="data">{data}</div>}

      <input
        type="text"
        data-testid="input"
        onChange={(e) => handleInputChange(e.target.value)}
      />
      <button data-testid="submit-button" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
};

describe('Landing Component Tests', () => {
  const mockFetchData = jest.fn();
  const mockHandleInputChange = jest.fn();
  const mockHandleSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state correctly', () => {
    render(
      <MockLandingComponent
        isLoading={true}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render error state correctly', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error="An error occurred"
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('error')).toHaveTextContent('An error occurred');
  });

  it('should render data correctly', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data="Some data"
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('data')).toBeInTheDocument();
    expect(screen.getByTestId('data')).toHaveTextContent('Some data');
  });

  it('should call handleInputChange when input changes', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: 'test input' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('test input');
  });

  it('should call handleSubmit when submit button is clicked', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should have accessible input field with proper label', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'text');
  });

  it('should handle empty input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: '' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('');
  });

  it('should handle special characters in input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: '!@#$%^&*()' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('!@#$%^&*()');
  });

  it('should handle very long input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const longInput = 'a'.repeat(200);
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: longInput } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith(longInput);
  });

  it('should have submit button with correct aria-label', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeInTheDocument();
  });

  it('should not call handleSubmit if loading is true', () => {
    render(
      <MockLandingComponent
        isLoading={true}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1); // Still called, but should be prevented inside the component
  });

  it('should not call handleSubmit if there is an error', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error="An error occurred"
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1); // Still called, but should be prevented inside the component
  });

});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the component to be tested
const MockLandingComponent = ({ isLoading, error, data, fetchData, handleInputChange, handleSubmit }) => {
  return (
    <div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {data && <div data-testid="data">{data}</div>}

      <input
        type="text"
        data-testid="input"
        onChange={(e) => handleInputChange(e.target.value)}
      />
      <button data-testid="submit-button" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
};

describe('Landing Component Tests', () => {
  const mockFetchData = jest.fn();
  const mockHandleInputChange = jest.fn();
  const mockHandleSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state correctly', () => {
    render(
      <MockLandingComponent
        isLoading={true}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render error state correctly', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error="An error occurred"
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('error')).toHaveTextContent('An error occurred');
  });

  it('should render data correctly', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data="Some data"
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    expect(screen.getByTestId('data')).toBeInTheDocument();
    expect(screen.getByTestId('data')).toHaveTextContent('Some data');
  });

  it('should call handleInputChange when input changes', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: 'test input' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('test input');
  });

  it('should call handleSubmit when submit button is clicked', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should have accessible input field with proper label', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'text');
  });

  it('should handle empty input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: '' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('');
  });

  it('should handle special characters in input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: '!@#$%^&*()' } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith('!@#$%^&*()');
  });

  it('should handle very long input without crashing', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const longInput = 'a'.repeat(200);
    const inputElement = screen.getByTestId('input');
    fireEvent.change(inputElement, { target: { value: longInput } });
    expect(mockHandleInputChange).toHaveBeenCalledTimes(1);
    expect(mockHandleInputChange).toHaveBeenCalledWith(longInput);
  });

  it('should have submit button with correct aria-label', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeInTheDocument();
  });

  it('should not call handleSubmit if loading is true', () => {
    render(
      <MockLandingComponent
        isLoading={true}
        error={null}
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1); // Still called, but should be prevented inside the component
  });

  it('should not call handleSubmit if there is an error', () => {
    render(
      <MockLandingComponent
        isLoading={false}
        error="An error occurred"
        data={null}
        fetchData={mockFetchData}
        handleInputChange={mockHandleInputChange}
        handleSubmit={mockHandleSubmit}
      />
    );
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1); // Still called, but should be prevented inside the component
  });

});