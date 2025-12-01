import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern E-commerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  id: 'user123',
  subscription: { plan: 'premium', active: true },
  isAdmin: false,
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error message when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Failed to load templates' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ecommerce/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /premium/i })).toBeInTheDocument();

      mockTemplates.forEach(template => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
        expect(screen.getByAltText(`Preview of ${template.name}`)).toBeInTheDocument();
      });
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category when tab is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      await user.click(ecommerceTab);

      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();

      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      expect(screen.queryByText(/modern e-commerce/i)).not.toBeInTheDocument();
      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
    });

    it('should show all templates when "All" tab is selected', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      const allTab = screen.getByRole('tab', { name: /all/i });
      await user.click(allTab);

      mockTemplates.forEach(template => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    it('should show template details in preview panel when template is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
      expect(screen.getByAltText(/modern e-commerce preview/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });

    it('should show premium badge for premium templates', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      expect(screen.getByText(/premium template/i)).toBeInTheDocument();
      expect(screen.getByTestId('premium-badge')).toBeInTheDocument();
    });

    it('should not show premium badge for non-premium templates', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      expect(screen.queryByText(/premium template/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('premium-badge')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should allow user to select a template', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Template selected successfully!',
          type: 'success',
        });
      });
    });

    it('should show loading state when saving template', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when template selection fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Failed to save'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: { message: 'Failed to save template' },
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to save template',
          type: 'error',
        });
      });
    });

    it('should prevent non-premium users from selecting premium templates', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { plan: 'free', active: true } },
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      expect(useTemplateButton).toBeDisabled();

      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      mockTemplates.forEach(template => {
        const templateCard = screen.getByText(template.name).closest('article');
        expect(templateCard).toHaveAttribute('aria-labelledby', expect.stringContaining(template.id));
        expect(templateCard).toHaveAttribute('role', 'article');
      });
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);

      // Focus the template
      modernTemplate.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
    });

    it('should have proper contrast and focus indicators', () => {
      render(<DesignArchitecture />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveStyle('outline: none');
        fireEvent.focus(tab);
        expect(tab).toHaveStyle('box-shadow: 0 0 0 2px #3b82f6');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
      expect(screen.getByText(/try refreshing or check back later/i)).toBeInTheDocument();
    });

    it('should show skeleton loaders while templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const skeletons = screen.getAllByTestId('template-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
      skeletons.forEach(skeleton => {
        expect(skeleton).toBeInTheDocument();
      });
    });

    it('should handle network errors when loading templates', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Network Error' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/please check your connection/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should show full-screen preview when preview button is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByAltText(/full preview of modern e-commerce/i)).toBeInTheDocument();
    });

    it('should close full-screen preview when close button is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close full-screen preview when clicking outside', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      const modalOverlay = screen.getByTestId('modal-overlay');
      await user.click(modalOverlay);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const templateGrid = screen.getByTestId('template-grid');
      expect(templateGrid).toHaveStyle('grid-template-columns: repeat(1, 1fr)');

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should show mobile-friendly navigation', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(menuButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /ecommerce/i })).toBeInTheDocument();

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignArchitecture } from './DesignArchitecture';
import { useDesignTemplates, useSaveDesign, useLoadDesign } from '../../hooks/designHooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DesignTemplate } from '../../types/designTypes';

// Mock hooks and context
jest.mock('../../hooks/designHooks');
jest.mock('../../context/AuthContext');
jest.mock('../../context/ToastContext');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockTemplates: DesignTemplate[] = [
  {
    id: '1',
    name: 'Modern E-commerce',
    thumbnail: 'modern-thumb.jpg',
    categories: ['ecommerce', 'modern'],
    previewUrl: 'modern-preview.jpg',
    isPremium: false,
  },
  {
    id: '2',
    name: 'Minimalist Store',
    thumbnail: 'minimalist-thumb.jpg',
    categories: ['ecommerce', 'minimalist'],
    previewUrl: 'minimalist-preview.jpg',
    isPremium: true,
  },
];

const mockUser = {
  id: 'user123',
  subscription: { plan: 'premium', active: true },
  isAdmin: false,
};

describe('DesignArchitecture Component', () => {
  const mockUseDesignTemplates = useDesignTemplates as jest.Mock;
  const mockUseSaveDesign = useSaveDesign as jest.Mock;
  const mockUseLoadDesign = useLoadDesign as jest.Mock;
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseToast = useToast as jest.Mock;
  const mockShowToast = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseDesignTemplates.mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseSaveDesign.mockReturnValue({
      saveDesign: jest.fn().mockResolvedValue({ success: true }),
      isSaving: false,
      error: null,
    });
    mockUseLoadDesign.mockReturnValue({
      loadDesign: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render loading state when templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading design templates/i)).toBeInTheDocument();
    });

    it('should render error message when templates fail to load', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Failed to load templates' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);
      expect(screen.getByText(/failed to load design templates/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render template categories and templates when loaded successfully', () => {
      render(<DesignArchitecture />);

      expect(screen.getByText(/design architecture/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ecommerce/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /premium/i })).toBeInTheDocument();

      mockTemplates.forEach(template => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
        expect(screen.getByAltText(`Preview of ${template.name}`)).toBeInTheDocument();
      });
    });
  });

  describe('Template Filtering', () => {
    it('should filter templates by category when tab is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const ecommerceTab = screen.getByRole('tab', { name: /ecommerce/i });
      await user.click(ecommerceTab);

      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();

      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      expect(screen.queryByText(/modern e-commerce/i)).not.toBeInTheDocument();
      expect(screen.getByText(/minimalist store/i)).toBeInTheDocument();
    });

    it('should show all templates when "All" tab is selected', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const premiumTab = screen.getByRole('tab', { name: /premium/i });
      await user.click(premiumTab);

      const allTab = screen.getByRole('tab', { name: /all/i });
      await user.click(allTab);

      mockTemplates.forEach(template => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    it('should show template details in preview panel when template is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
      expect(screen.getByAltText(/modern e-commerce preview/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use this template/i })).toBeInTheDocument();
    });

    it('should show premium badge for premium templates', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      expect(screen.getByText(/premium template/i)).toBeInTheDocument();
      expect(screen.getByTestId('premium-badge')).toBeInTheDocument();
    });

    it('should not show premium badge for non-premium templates', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      expect(screen.queryByText(/premium template/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('premium-badge')).not.toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('should allow user to select a template', async () => {
      const mockSaveDesign = jest.fn().mockResolvedValue({ success: true });
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockSaveDesign).toHaveBeenCalledWith('1');
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Template selected successfully!',
          type: 'success',
        });
      });
    });

    it('should show loading state when saving template', async () => {
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))),
        isSaving: true,
        error: null,
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/applying template/i)).toBeInTheDocument();
    });

    it('should show error when template selection fails', async () => {
      const mockSaveDesign = jest.fn().mockRejectedValue(new Error('Failed to save'));
      mockUseSaveDesign.mockReturnValueOnce({
        saveDesign: mockSaveDesign,
        isSaving: false,
        error: { message: 'Failed to save template' },
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      await user.click(useTemplateButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Failed to save template',
          type: 'error',
        });
      });
    });

    it('should prevent non-premium users from selecting premium templates', async () => {
      mockUseAuth.mockReturnValueOnce({
        user: { ...mockUser, subscription: { plan: 'free', active: true } },
      });

      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const minimalistTemplate = screen.getByText(/minimalist store/i);
      await user.click(minimalistTemplate);

      const useTemplateButton = screen.getByRole('button', { name: /use this template/i });
      expect(useTemplateButton).toBeDisabled();

      expect(screen.getByText(/upgrade to premium to use this template/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for template cards', () => {
      render(<DesignArchitecture />);

      mockTemplates.forEach(template => {
        const templateCard = screen.getByText(template.name).closest('article');
        expect(templateCard).toHaveAttribute('aria-labelledby', expect.stringContaining(template.id));
        expect(templateCard).toHaveAttribute('role', 'article');
      });
    });

    it('should have proper keyboard navigation for template selection', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);

      // Focus the template
      modernTemplate.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText(/template preview/i)).toBeInTheDocument();
      expect(screen.getByText(/modern e-commerce/i)).toBeInTheDocument();
    });

    it('should have proper contrast and focus indicators', () => {
      render(<DesignArchitecture />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveStyle('outline: none');
        fireEvent.focus(tab);
        expect(tab).toHaveStyle('box-shadow: 0 0 0 2px #3b82f6');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template list gracefully', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/no design templates available/i)).toBeInTheDocument();
      expect(screen.getByText(/try refreshing or check back later/i)).toBeInTheDocument();
    });

    it('should show skeleton loaders while templates are loading', () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      const skeletons = screen.getAllByTestId('template-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
      skeletons.forEach(skeleton => {
        expect(skeleton).toBeInTheDocument();
      });
    });

    it('should handle network errors when loading templates', async () => {
      mockUseDesignTemplates.mockReturnValueOnce({
        templates: [],
        isLoading: false,
        error: { message: 'Network Error' },
        refetch: jest.fn(),
      });

      render(<DesignArchitecture />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/please check your connection/i)).toBeInTheDocument();
    });
  });

  describe('Template Preview', () => {
    it('should show full-screen preview when preview button is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByAltText(/full preview of modern e-commerce/i)).toBeInTheDocument();
    });

    it('should close full-screen preview when close button is clicked', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close full-screen preview when clicking outside', async () => {
      render(<DesignArchitecture />);

      const user = userEvent.setup();
      const modernTemplate = screen.getByText(/modern e-commerce/i);
      await user.click(modernTemplate);

      const previewButton = screen.getByRole('button', { name: /full preview/i });
      await user.click(previewButton);

      const modalOverlay = screen.getByTestId('modal-overlay');
      await user.click(modalOverlay);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adjust layout for mobile viewports', () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const templateGrid = screen.getByTestId('template-grid');
      expect(templateGrid).toHaveStyle('grid-template-columns: repeat(1, 1fr)');

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });

    it('should show mobile-friendly navigation', async () => {
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      render(<DesignArchitecture />);

      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(menuButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /ecommerce/i })).toBeInTheDocument();

      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
    });
  });
});