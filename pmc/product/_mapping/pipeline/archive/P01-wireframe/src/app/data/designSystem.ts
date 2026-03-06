/**
 * DESIGN SYSTEM DOCUMENTATION
 * BrightRun LoRA Training Pipeline
 * 
 * This file documents the design system tokens used throughout the application.
 * All subsequent prompts (P02-P05) must use these tokens for consistency.
 */

export const DESIGN_SYSTEM = {
  /**
   * COLOR TOKENS
   * Usage: Use for status indicators, badges, and semantic colors
   */
  colors: {
    // Primary Actions & Training Active
    primaryBlue: '#2563EB',
    
    // Success States & Completed
    successGreen: '#10B981',
    
    // Warning States & Queued
    warningAmber: '#F59E0B',
    
    // Error States & Failed
    errorRed: '#EF4444',
    
    // Neutral & Pending
    neutralGray: '#6B7280',
    
    // Backgrounds
    background: {
      light: '#F9FAFB',
      dark: '#111827'
    },
    
    // Surfaces
    surface: {
      light: '#FFFFFF',
      dark: '#1F2937'
    }
  },

  /**
   * TYPOGRAPHY SCALE
   * Usage: Use these for consistent text hierarchy
   * Note: Do not use Tailwind font classes (text-2xl, font-bold, etc.) unless specifically requested
   * The theme.css file handles default typography for HTML elements
   */
  typography: {
    heading1: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600
    },
    heading2: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 600
    },
    heading3: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 600
    },
    body: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400
    },
    small: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 400
    },
    mono: {
      fontSize: '13px',
      lineHeight: '20px',
      fontFamily: 'monospace'
    }
  },

  /**
   * SPACING SCALE
   * Usage: Use for consistent padding, margins, and gaps
   */
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px'
  },

  /**
   * LAYOUT DIMENSIONS
   * Usage: Fixed dimensions for layout components
   * MUST be consistent across all prompts
   */
  layout: {
    sidebarWidth: {
      expanded: '240px',
      collapsed: '72px'
    },
    headerHeight: '60px',
    logoHeight: '80px',
    rightPanelWidth: '300px'
  },

  /**
   * BREAKPOINTS
   * Usage: Responsive design breakpoints
   */
  breakpoints: {
    mobile: '<768px',
    tablet: '768-1279px',
    desktop: '>1280px'
  },

  /**
   * ANIMATIONS
   * Usage: Consistent animation timing
   */
  animations: {
    transitionDuration: '200ms',
    transitionEasing: 'ease-out',
    pulseAnimation: '2s infinite'
  },

  /**
   * COMPONENT STATES
   * Usage: Standard states for interactive components
   */
  states: {
    training: {
      color: 'blue',
      bgClass: 'bg-blue-500',
      animation: 'pulse'
    },
    queued: {
      color: 'amber',
      bgClass: 'bg-amber-500',
      animation: 'none'
    },
    completed: {
      color: 'green',
      bgClass: 'bg-green-500',
      animation: 'none'
    },
    failed: {
      color: 'red',
      bgClass: 'bg-red-500',
      animation: 'none'
    },
    warning: {
      color: 'amber',
      bgClass: 'bg-amber-500',
      animation: 'pulse'
    }
  }
} as const;

/**
 * INTERFACE POINTS FOR SUBSEQUENT PROMPTS
 * 
 * These are the integration points that P02-P05 must use:
 * 
 * 1. content_area_container
 *    - Render location: <main> element in DashboardLayout
 *    - Usage: All page content should be rendered inside this container
 * 
 * 2. breadcrumb_component
 *    - Component: AppHeader accepts breadcrumbs prop
 *    - Type: BreadcrumbItem[] (exported from AppHeader)
 *    - Usage: Pass breadcrumb data to show navigation path
 * 
 * 3. sidebar_active_state
 *    - Component: AppSidebar accepts activeSection prop
 *    - Type: NavSection = 'dashboard' | 'datasets' | 'training' | 'models' | 'settings'
 *    - Usage: Indicates which navigation item is active
 * 
 * 4. header_actions_slot
 *    - Location: Can add custom actions to page content
 *    - Usage: Add contextual buttons/actions in page header area
 * 
 * 5. notification_system
 *    - Component: NotificationPanel (via AppHeader)
 *    - Function: Use toast() from sonner for new notifications
 *    - Usage: toast.success(), toast.error(), toast.info()
 * 
 * 6. cost_tracker_integration
 *    - Component: CostTracker (via AppHeader)
 *    - Type: CostData from mockData.ts
 *    - Usage: Update mock data to reflect new costs
 */

/**
 * MANDATORY COMPONENTS FOR CONSISTENCY
 * 
 * These components MUST be used consistently across P02-P05:
 * 
 * 1. Layout Shell
 *    - DashboardLayout: Main application wrapper
 *    - AppSidebar: Navigation sidebar (240px / 72px / hidden)
 *    - AppHeader: Top header bar (60px height)
 * 
 * 2. Status Indicators
 *    - ActiveTrainingIndicator: Shows active jobs in header
 *    - NotificationPanel: Bell icon with dropdown
 *    - CostTracker: Monthly cost display
 * 
 * 3. Navigation
 *    - Use NavSection type for all navigation
 *    - Use BreadcrumbItem type for breadcrumbs
 *    - Maintain consistent navigation flow
 * 
 * 4. Data Types
 *    - TrainingJob: Training job structure
 *    - Notification: Notification structure
 *    - CostData: Cost tracking structure
 *    - All types exported from mockData.ts
 */

export type DesignSystem = typeof DESIGN_SYSTEM;
