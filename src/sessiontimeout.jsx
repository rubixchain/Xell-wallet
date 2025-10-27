import { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from './routes/routes';
import { UserContext } from './context/userContext';
import { WALLET_TYPES } from './enums';

const UseSessionTimeout = () => {
    const { setIsUserLoggedIn, isUserLoggedIn, autoLockTime, setUserDetails } = useContext(UserContext);
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const resetTimeout = (timeoutMinutes = 0) => {
        if (timeoutMinutes === 0) {
            timeoutMinutes = 60 * 24
        }
        let lastActivity = Date.now()
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => checkActivity(timeoutMinutes, lastActivity), 1000);
    };


    const checkActivity = (timeoutMinutes, lastActivity) => {
        const timeoutMs = timeoutMinutes * 60 * 1000;
        if (Date.now() - lastActivity >= timeoutMs) {
            clearInterval(timerRef.current);
            setIsUserLoggedIn(false);
            setUserDetails(null);
            chrome.runtime.sendMessage({ type: WALLET_TYPES.CLEAR_USER_DETAILS });
            let ls = localStorage.getItem('currentUser');

            if (!ls) {
                navigate(routes.SETUP_WALLET, { replace: true });
                return;
            }
            navigate(routes.LOGIN, { replace: true });
        }
    };

    useEffect(() => {
        if (!isUserLoggedIn) {
            return
        }
        const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'touchstart',];

        const updateActivity = () => {
            resetTimeout(autoLockTime);
        };

        events.forEach(event => document.addEventListener(event, updateActivity));

        resetTimeout(autoLockTime);

        return () => {
            events.forEach(event => document.removeEventListener(event, updateActivity));
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [navigate, autoLockTime]);

    useEffect(() => {
        if (isUserLoggedIn) {
            resetTimeout(autoLockTime);
        }
    }, [isUserLoggedIn,]);

    return null
};

export default UseSessionTimeout;