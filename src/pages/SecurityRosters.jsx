import DepartmentRosterPage from './DepartmentRosterPage';
import { SECURITY_DEPARTMENT_ROLES } from '@/lib/dataStore';

export default function SecurityRosters() {
  return (
    <DepartmentRosterPage
      title="Security"
      description="Security Managers can assign security jobs for flights once the one-hour window opens."
      department="security"
      visibilityRoles={['Security', 'Flight Dispatcher']}
      leadPosition="Security Manager"
      autoLeadLabel="Security Manager"
      assignableFromPosition="Security Officer"
      assignmentRoles={SECURITY_DEPARTMENT_ROLES}
    />
  );
}
