import React from 'react';
import DistributorDashboard from './DistributorDashboard';

/**
 * Responsibility: Entry point for the Distributor module.
 * Defaults to the DistributorDashboard for insights and procurement management.
 */
const DistributorPages: React.FC = () => {
  return <DistributorDashboard />;
};

export default DistributorPages;
