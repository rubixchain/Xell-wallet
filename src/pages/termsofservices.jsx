import { useNavigate } from "react-router-dom";
import { IoArrowBack } from 'react-icons/io5';
import Card from "../components/Card";
export default function TermsOfService() {
    const navigate = useNavigate()
    return (
        <Card>
            <div className=" text-text">
                <button onClick={() => navigate(-1)} className="mb-4 flex items-center ">
                    <IoArrowBack size={20} />
                </button>
                <h2 className="mb-4 text-xl font-bold ">Terms of Service</h2>
                <p>Welcome to Xell Wallet. By using our browser extension, you agree to the following Terms of Service. If you do not agree, do not use the extension.</p>
                <ol className="pl-5 space-y-4 mt-4">
                    <li>
                        <strong className="">Overview:</strong>
                        <p>Xell Wallet is a self-custodial BIP39 wallet for managing Rubix blockchain assets, including RBT, FT, and NFT tokens. We do not store or access your private keys, recovery phrases, or account data.</p>
                    </li>
                    <li>
                        <strong className="">User Responsibility:</strong>
                        <p>You are solely responsible for securing your recovery phrase and private keys. Loss of this information may result in permanent loss of access to your assets. We cannot recover your wallet.</p>
                    </li>
                    <li>
                        <strong className="">Eligibility:</strong>
                        <p>You must be at least 18 years old to use this extension.</p>
                    </li>
                    <li>
                        <strong className="">Prohibited Use:</strong>
                        <ul className="list-disc pl-5">
                            <li>Illegal activities</li>
                            <li>Fraud or unauthorized transactions</li>
                            <li>Circumventing security systems or regulations</li>
                        </ul>
                    </li>
                    <li>
                        <strong className="">Third-Party Services:</strong>
                        <p>The extension may interact with third-party APIs (e.g., blockchain explorers). We are not responsible for their data practices. Use of such services is subject to their own terms.</p>
                    </li>
                    <li>
                        <strong className="">No Warranty:</strong>
                        <p>The extension is provided “as is” without warranties of any kind. We make no guarantees about availability, reliability, or accuracy.</p>
                    </li>
                    <li>
                        <strong className="">Limitation of Liability:</strong>
                        <p>We are not liable for any direct or indirect losses resulting from your use of the extension, including loss of access, tokens, or data.</p>
                    </li>
                    <li>
                        <strong className="">Modifications:</strong>
                        <p>We reserve the right to modify or discontinue the extension or these terms at any time. Continued use constitutes acceptance of any changes.</p>
                    </li>
                    <li>
                        <strong className="">Contact:</strong>
                        <p>For support or questions, contact us at: <a href="mailto:support@xellwallet.com" className="text-blue-600">support@xellwallet.com</a></p>
                    </li>
                </ol>
            </div>
        </Card>
    );
}