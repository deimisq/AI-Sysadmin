import DashboardLayout from '../components/dashboard-layout';
import { DashboardView } from '../components/views/DashboardView';

export default function Dashboard() {
    return (
        <DashboardLayout>
            <DashboardView />
        </DashboardLayout>
    );
}
