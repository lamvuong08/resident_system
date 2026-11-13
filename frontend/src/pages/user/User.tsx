import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import ChatWidget from "../../components/chat/ChatWidget";
import "../../styles/sidebar.css";

const UserPage = () => {
  return (
    <div className="admin-root resident-user-shell">
      <Sidebar />
      <main className="admin-main">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
};

export default UserPage;
