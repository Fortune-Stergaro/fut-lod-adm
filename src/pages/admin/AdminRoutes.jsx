import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout.jsx";
import AdminBookings from "./AdminBookings.jsx";
import AdminAnalytics from "./AdminAnalytics.jsx";
import AdminRequests from "./AdminRequests.jsx";
import AdminReview from "./AdminReview.jsx";
import AdminInterests from "./AdminInterests.jsx";
import AdminLodges from "./AdminLodges.jsx";
import AdminAgents from "./AdminAgents.jsx";
import AdminAgentPage from "./AdminAgentPage.jsx";
import AdminStats from "./AdminStats.jsx";
import NotFound from "../NotFound.jsx";

// Loaded lazily, only after AdminGate confirms the signed-in user is an admin, so other visitors never even download this code.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminBookings />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="requests/:id" element={<AdminReview />} />
        <Route path="interests" element={<AdminInterests />} />
        <Route path="lodges" element={<AdminLodges />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="agents/:id" element={<AdminAgentPage />} />
        <Route path="stats" element={<AdminStats />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
