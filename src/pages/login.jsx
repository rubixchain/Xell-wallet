import React, { useEffect, useState, useContext, useRef } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import RubixLogo from '../components/RubixLogo';
import Card from '../components/Card';
import PinInput from '../components/setup/PinInput';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import { ROUTES } from '../utils/constants';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { ENUMS } from '../enums';


// Logo Component
const Logo = () => (
    <div className="flex items-center gap-2">
        <div className="grid grid-cols-2 gap-0.5">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-yellow-300" />
            ))}
        </div>
        <span className="text-2xl font-bold text-primary">Xell</span>
    </div>
);

// Main App Component
function Login() {
    const { setUserDetails, userDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)
    const [attempts, setAttempts] = useState(5);
    const [isOpen, setIsOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState(users[0]);
    const navigate = useNavigate()
    const popupRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [])

    useEffect(() => {
        (async () => {
            let res = await indexDBUtil.getData()
            if (res?.status) {
                setUsers(res?.data)
            }
            let currentUser = localStorage.getItem("currentUser")
            if (currentUser) {
                setSelectedUser(JSON.parse(currentUser))
                return
            }
            // if (userDetails?.username) {
            //     setSelectedUser(userDetails)
            //     return
            // }
            setSelectedUser(res?.data[0])
        })()

    }, [userDetails])


    const handlePinComplete = (enteredPin) => {
        setPin(enteredPin);
    };


    const handleUnlock = async () => {
        if (pin.length === 6) {
            let res = await indexDBUtil.validateAndGetAccount(selectedUser?.username, pin)
            if (!res?.status) {
                toast.error(res?.message)
                setAttempts(prev => prev - 1)
                if (attempts == 1) {
                    navigate(ROUTES.WELCOME, { replace: true })
                }
                return
            }
            let getActivenetwork = await indexDBUtil.getNetworksByDID(res?.data?.did) || []
            getActivenetwork = getActivenetwork?.find(item => item?.selected)
            if (getActivenetwork) {
                getActivenetwork = {
                    network: getActivenetwork?.id,
                    RPCUrl: getActivenetwork?.rpcUrls?.find(item => item?.selected)?.url,
                    name: getActivenetwork?.name,
                    tokenSymbol: getActivenetwork?.tokenSymbol
                }
            }
            toast.success('login success')
            indexDBUtil.setCurrentVersion()
            indexDBUtil.storeNetworkSetting({
                network: getActivenetwork?.network,
                RPCUrl: getActivenetwork?.RPCUrl,
                name: getActivenetwork?.name,
                tokenSymbol: getActivenetwork?.tokenSymbol
            })
            localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }))
            localStorage.setItem("currentUser", JSON.stringify({
                username: res?.data?.username,
                network: res?.data?.network
            }))
            await EXECUTE_API({
                data: {
                    ...res?.data,
                    tokenSymbol: getActivenetwork?.tokenSymbol

                },
                type: WALLET_TYPES.STORE_USER_DETAILS
            });
            setIsUserLoggedIn(true)
            setUserDetails({
                ...res?.data,
                did: res?.data?.did,
                username: res?.data?.username,
                network: res?.data?.network,
                pin: res?.data?.pin,
                tokenSymbol: getActivenetwork?.tokenSymbol
            })
            
            localStorage.setItem("currentUser", JSON.stringify({
                username: res?.data?.username,
                network: res?.data?.network
            }))
            localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()))
            navigate(routes.DASHBOARD, { replace: true })
        }
    };

    return (
        <Card>
            <div className="flex w-full h-full flex-col justify-center items-center y-5">

                <div className='flex items-center'>
                    <img
                        src="/images/xell-wallet.svg"
                        alt="Xell Wallet Logo"
                        style={{ width: '100px', height: 'auto' }}
                    />
                </div>

                <h1 className="text-3xl font-extrabold text-center text-senary mb-3 mt-6">
                    Welcome back
                </h1>
                <p className="text-center text-sm font-medium text-quinary mb-5">
                    Enter your PIN to unlock your wallet
                </p>

                <div className="mb-8 relative w-full" ref={popupRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-center px-4 py-3 bg-surface-low rounded-lg text-senary hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-quinary">@</span>
                            <span className='text-senary font-medium text-sm'>{selectedUser?.username}</span>
                        </div>
                        <FiChevronDown className={`w-5 h-5 text-quinary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                        <div
                            style={{
                                minHeight: '30px',
                                maxHeight: '150px',
                                overflowY: 'auto'
                            }}
                            className="absolute w-full mt-1 bg-quaternary rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                            {users?.map((user) => (
                                <button
                                    key={user.username}
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-surface-low transition-colors ${selectedUser.username === user.username ? 'bg-surface-low' : ''
                                        }`}
                                >
                                    <div className="flex justify-between gap-2">
                                        <div style={{ width: 200 }} className="gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                                            <span className="text-quinary me-1">@</span>
                                            <span>{user?.username}</span>
                                        </div>
                                        {/* <span className='bg-green-600 p-1 px-2 text-white text-xs rounded-lg'>{user?.network?.toUpperCase()}</span> */}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <PinInput
                        onChange={handlePinComplete}
                        value={pin}
                        length={6}
                        error={error}
                        onComplete={handleUnlock}
                    />
                    {/* <SetupPin onSubmit={handlePinComplete} error={error} /> */}
                    <p className="text-center text-sm text-quinary mt-4">
                        {attempts} of 5 attempts remaining
                    </p>
                </div>

                <button
                    onClick={handleUnlock}
                    disabled={pin.length !== 6}
                    className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:cursor-not-allowed"
                >
                    Unlock
                </button>
                <p className="my-4 font-medium ">--- Or ---</p>
                <button
                    onClick={() => {
                        setUserDetails({});
                        navigate(ROUTES.WELCOME, { replace: true });
                    }}
                    className="font-semibold text-sm underline underline-offset-2 decoration-[1.5px] decoration-black"
                >
                    Create or Import Wallet
                </button>

            </div>
        </Card>
    );
}

export default Login;