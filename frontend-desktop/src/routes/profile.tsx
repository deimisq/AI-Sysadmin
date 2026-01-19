import DashboardLayout from "@/components/dashboard-layout";
import { ProfileView } from "@/components/views/ProfileView";

export function Profile() {
    return (
        <DashboardLayout>
            <ProfileView />
        </DashboardLayout>
    );
}

export default Profile;
