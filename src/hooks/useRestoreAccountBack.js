import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/userContext';
import { routes } from '../routes/routes';

// When the Create/Import Wallet flow is opened from the dashboard, the active
// account is reset and stashed in sessionStorage. Going Back must restore it,
// otherwise the dashboard renders an empty account (e.g. "undefined…undefined").
export default function useRestoreAccountBack(fromDashboard) {
  const navigate = useNavigate();
  const { setUserDetails } = useContext(UserContext);

  return () => {
    if (fromDashboard) {
      const previous = sessionStorage.getItem('previousUserDetails');
      if (previous) {
        setUserDetails(JSON.parse(previous));
        sessionStorage.removeItem('previousUserDetails');
      }
      navigate(routes.DASHBOARD);
    } else {
      navigate(-1);
    }
  };
}
