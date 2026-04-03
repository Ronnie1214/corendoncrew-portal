import DepartmentRosterPage from './DepartmentRosterPage';
import { AIRSIDE_DEPARTMENT_ROLES } from '@/lib/dataStore';

export default function AirsideOperations() {
  return (
    <DepartmentRosterPage
      title="Airside Operations"
      description="Turnaround Coordinators can assign ramp-role jobs for flights once the one-hour window opens."
      department="airside_operations"
      visibilityRoles={['Executive Board', 'Senior Board', 'Airside Operations', 'Flight Dispatcher']}
      leadPosition="Turnaround Coordinator"
      autoLeadLabel="TCO"
      assignableFromPosition="Ramp Agent"
      assignmentRoles={AIRSIDE_DEPARTMENT_ROLES}
      lockedMessage="This channel is locked to Senior Management and Airside Operations."
    />
  );
}
