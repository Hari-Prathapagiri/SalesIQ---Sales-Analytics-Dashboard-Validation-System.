import React from 'react';
import { Layout } from './components/Layout';
import { SalesProvider, useSales } from './context/SalesContext';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DashboardValidationPage } from './pages/DashboardValidationPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsDocsPage } from './pages/SettingsDocsPage';
import { SqlAnalysisPage } from './pages/SqlAnalysisPage';

const ActivePageRouter: React.FC = () => {
  const { activePage } = useSales();

  switch (activePage) {
    case 'overview':
      return <OverviewPage />;
    case 'data-management':
      return <DataManagementPage />;
    case 'analytics':
      return <AnalyticsPage />;
    case 'dashboard-validation':
      return <DashboardValidationPage />;
    case 'sql-analysis':
      return <SqlAnalysisPage />;
    case 'data-quality':
      return <DataQualityPage />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
      return <SettingsDocsPage />;
    default:
      return <OverviewPage />;
  }
};

export default function App() {
  return (
    <SalesProvider>
      <Layout>
        <ActivePageRouter />
      </Layout>
    </SalesProvider>
  );
}
