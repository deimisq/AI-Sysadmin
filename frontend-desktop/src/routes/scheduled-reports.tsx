import DashboardLayout from "@/components/dashboard-layout";
import { ReportsView } from "@/components/views/ReportsView";

export function ScheduledReports() {
    return (
        <DashboardLayout>
            <ReportsView />
        </DashboardLayout>
    );
}

// Ensure default export if used by router
export default ScheduledReports;
