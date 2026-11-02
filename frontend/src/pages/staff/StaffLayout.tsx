import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import '../../styles/sidebar.css'

const StaffLayout = () => {
  return (
    <div className="admin-root">
      <Sidebar />
      <main className="admin-main" style={{ textAlign: 'left' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default StaffLayout
