import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import '../../styles/sidebar.css'

const AdminPage = () => {
  return (
    <div className="admin-root">
      <Sidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminPage
