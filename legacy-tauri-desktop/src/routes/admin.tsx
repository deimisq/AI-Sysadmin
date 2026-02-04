import { AdminLayout } from "@/components/admin-layout";
import { AdminView } from "@/components/views/AdminView";

export function Admin() {
    return (
        <AdminLayout>
            <AdminView />
        </AdminLayout>
    );
}

export default Admin;
