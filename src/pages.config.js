import Dashboard from './pages/Dashboard';
import Committees from './pages/Committees';
import Jobs from './pages/Jobs';
import ShiftManagement from './pages/ShiftManagement';
import MyPage from './pages/MyPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Committees": Committees,
    "Jobs": Jobs,
    "ShiftManagement": ShiftManagement,
    "MyPage": MyPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};