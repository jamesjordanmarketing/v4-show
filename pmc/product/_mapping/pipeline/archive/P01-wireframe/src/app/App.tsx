import React, { useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './components/pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { TrainingJobsPage } from './components/pages/TrainingJobsPage';
import { ModelsPage } from './components/pages/ModelsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { TrainingConfiguratorPage } from './pages/TrainingConfiguratorPage';
import { TrainingMonitorPage } from './pages/TrainingMonitorPage';
import { ModelArtifactsPage } from './pages/ModelArtifactsPage';
import { NavSection } from './components/layout/AppSidebar';
import type { BreadcrumbItem } from './components/layout/AppHeader';
import {
  mockActiveJobs,
  mockQueuedJobs,
  mockCompletedJobs,
  mockNotifications,
  mockCostData,
  mockUserData,
  mockRecentActivity,
  type Notification
} from './data/mockData';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  // Routing state for sub-pages
  const [currentView, setCurrentView] = useState<{
    type: 'main' | 'configurator' | 'monitor' | 'artifacts';
    params?: Record<string, string>;
  }>({ type: 'main' });

  // Get breadcrumbs based on active section and current view
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', onClick: () => handleNavigateToMain('dashboard') }
    ];

    // Handle sub-views
    if (currentView.type === 'configurator') {
      breadcrumbs.push(
        { label: 'Datasets', onClick: () => handleNavigateToMain('datasets') },
        { label: 'Configure Training' }
      );
      return breadcrumbs;
    }

    if (currentView.type === 'monitor') {
      breadcrumbs.push(
        { label: 'Training Jobs', onClick: () => handleNavigateToMain('training') },
        { label: currentView.params?.jobName || 'Training Monitor' }
      );
      return breadcrumbs;
    }

    if (currentView.type === 'artifacts') {
      breadcrumbs.push(
        { label: 'Models', onClick: () => handleNavigateToMain('models') },
        { label: currentView.params?.modelName || 'Model Artifacts' }
      );
      return breadcrumbs;
    }

    // Main section breadcrumbs
    switch (activeSection) {
      case 'dashboard':
        breadcrumbs.push({ label: 'Dashboard' });
        break;
      case 'datasets':
        breadcrumbs.push({ label: 'Datasets' });
        break;
      case 'training':
        breadcrumbs.push({ label: 'Training Jobs' });
        break;
      case 'models':
        breadcrumbs.push({ label: 'Models' });
        break;
      case 'settings':
        breadcrumbs.push({ label: 'Settings' });
        break;
    }

    return breadcrumbs;
  };

  // Navigate to main sections
  const handleNavigateToMain = (section: NavSection) => {
    setActiveSection(section);
    setCurrentView({ type: 'main' });
    toast.success(`Navigated to ${section.charAt(0).toUpperCase() + section.slice(1)}`);
  };

  // Handle navigation
  const handleNavigate = (section: NavSection) => {
    handleNavigateToMain(section);
  };

  // Navigate to training configurator from dataset
  const handleStartTraining = (datasetId: string, datasetName: string) => {
    setCurrentView({ 
      type: 'configurator', 
      params: { datasetId, datasetName } 
    });
    toast.success('Opening Training Configurator');
  };

  // Navigate to training monitor
  const handleViewTrainingJob = (jobId: string, jobName?: string) => {
    setCurrentView({ 
      type: 'monitor', 
      params: { jobId, jobName } 
    });
    toast.success('Opening Training Monitor');
  };

  // Navigate to model artifacts
  const handleViewModelArtifact = (artifactId: string, modelName?: string) => {
    setCurrentView({ 
      type: 'artifacts', 
      params: { artifactId, modelName } 
    });
    toast.success('Opening Model Artifacts');
  };

  // Handle job click
  const handleJobClick = (jobId: string) => {
    if (jobId === 'all') {
      setActiveSection('training');
      setCurrentView({ type: 'main' });
      toast.info('Viewing all training jobs');
    } else {
      // Navigate to training monitor for this job
      handleViewTrainingJob(jobId);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    toast.info(`Opening: ${notification.title}`);
    if (notification.actionUrl) {
      // In a real app, this would navigate to the actual URL
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  // Render the current page
  const renderPage = () => {
    // Handle sub-views first
    if (currentView.type === 'configurator') {
      return (
        <TrainingConfiguratorPage
          datasetId={currentView.params?.datasetId}
          datasetName={currentView.params?.datasetName}
          onBack={() => handleNavigateToMain('datasets')}
          onStartTraining={(jobId, jobName) => handleViewTrainingJob(jobId, jobName)}
        />
      );
    }

    if (currentView.type === 'monitor') {
      return (
        <TrainingMonitorPage
          jobId={currentView.params?.jobId}
          onBack={() => handleNavigateToMain('training')}
          onViewArtifact={(artifactId, modelName) => handleViewModelArtifact(artifactId, modelName)}
        />
      );
    }

    if (currentView.type === 'artifacts') {
      return (
        <ModelArtifactsPage
          artifactId={currentView.params?.artifactId}
        />
      );
    }

    // Main section views
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardPage
            activeJobs={mockActiveJobs}
            completedJobs={mockCompletedJobs}
            recentActivity={mockRecentActivity}
            onViewTraining={() => handleNavigate('training')}
            onViewDatasets={() => handleNavigate('datasets')}
            onViewModels={() => handleNavigate('models')}
          />
        );
      case 'datasets':
        return <DatasetsPage onStartTraining={handleStartTraining} />;
      case 'training':
        return (
          <TrainingJobsPage
            activeJobs={mockActiveJobs}
            queuedJobs={mockQueuedJobs}
            completedJobs={mockCompletedJobs}
            onStartTraining={() => handleNavigate('datasets')}
            onViewJob={(jobId) => handleViewTrainingJob(jobId)}
          />
        );
      case 'models':
        return <ModelsPage onViewArtifact={handleViewModelArtifact} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage
          activeJobs={mockActiveJobs}
          completedJobs={mockCompletedJobs}
          recentActivity={mockRecentActivity}
        />;
    }
  };

  return (
    <>
      <DashboardLayout
        activeSection={activeSection}
        breadcrumbs={getBreadcrumbs()}
        activeJobs={mockActiveJobs}
        notifications={mockNotifications}
        costData={mockCostData}
        userData={mockUserData}
        environment="development"
        onNavigate={handleNavigate}
        onJobClick={handleJobClick}
        onNotificationClick={handleNotificationClick}
      >
        {renderPage()}
      </DashboardLayout>
      <Toaster position="top-right" />
    </>
  );
}