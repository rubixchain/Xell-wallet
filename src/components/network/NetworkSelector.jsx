import { useState, useRef, useEffect } from 'react';
import { FiMoreVertical, FiEdit, FiChevronDown, FiXCircle, FiTrash } from 'react-icons/fi';

export default function NetworkSelector({ networks, setIsOpen, setIsEditNetworkOpen, setEditingNetwork, setSelectedNetworkIndex, handleNetworkClick }) {

  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const filteredNetworks = networks.filter(network =>
    network.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleDropdown = (index) => {
    setOpenDropdown(openDropdown === index ? null : index);
  };

  const handleEditClick = (network, index) => {
    setSelectedNetworkIndex(network?.id)
    setEditingNetwork(network);
    setOpenDropdown(null);
    setIsOpen(false);
    setIsEditNetworkOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // setIsOpen(false);
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  return (
    <div className="fixed inset-0 p-4 bg-black bg-opacity-75 z-50 flex justify-center items-center">
      <div ref={dropdownRef} className="bg-white rounded-lg shadow-lg w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select a network</h2>
          <button className="text-gray-500" onClick={() => {
            setIsOpen(false);
            setEditingNetwork(null);
          }}>
            <FiXCircle className='h-5 w-5' />
          </button>
        </div>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          // className="w-full p-2 mb-4 border rounded"
          className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full p-3 border  rounded-lg outline-none focus:ring-2 focus:ring-primary"
        />
        <h3 className="text-base font-semibold my-3">Available networks</h3>
        <ul className="mb-4 h-48 overflow-y-auto">
          {filteredNetworks?.length > 0 ? filteredNetworks?.map((network, index) => (
            <li onClick={() => handleNetworkClick(network)} key={index} className={`flex mb-2 py-3 items-center justify-between p-2 rounded cursor-pointer relative
             ${network.selected ? 'bg-tertiary bg-opacity-90 text-gary-900' : 'text-gray-900'}`}>
              <div className="flex text-base items-center">
                {network?.logo ? (
                  <img
                    src={network?.logo}
                    alt={network.logo}
                    className="mr-2 rounded-sm h-5 w-5"
                    onError={(e) => {
                      
                      e.target.style.display = 'none';
                    }}
                 
                  />
                ) : (
                  <span className="mr-2 text-gray-900 border border-secondary font-medium text-secondary h-7 text-center flex items-center justify-center w-7 rounded-full text-sm ">{network.name?.slice(0, 1)?.toUpperCase()}</span>
                )}
                {network.name}
              </div>
              {!network?.default ? <FiMoreVertical className="text-gray-500" onClick={(e) => {
                e?.stopPropagation();
                e?.preventDefault();
                toggleDropdown(index)
              }} /> : null}
              {openDropdown === index && (
                <div ref={dropdownRef} className={`absolute right-3 
                ${filteredNetworks?.length - 1 !== index ? 'top-9' : 'bottom-9'}
                 z-50 w-24 bg-white border rounded shadow-l`}>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center" onClick={(e) => {
                    e?.stopPropagation();
                    e?.preventDefault();
                    handleEditClick(network, index)
                  }}>
                    <FiEdit className="mr-2" />
                    Edit
                  </button>
                </div>
              )}
            </li>
          )) :
            <p className='text-sm text-center font-medium'>No networks found</p>}
        </ul>
        <button className="w-full border border-secondary text-secondary text-sm font-semibold h-[45px] rounded-full hover:bg-secondary hover:text-white transition-all duration-300" onClick={() => {
          setIsOpen(false)
          setIsEditNetworkOpen(true)
          setEditingNetwork({})
        }}>Add a custom network</button>
      </div>
    </div>
  );
}