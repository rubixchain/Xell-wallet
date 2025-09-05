
import { IoArrowBack } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
export default function PrivacyPolicy() {
    const navigate = useNavigate()
    return (
        <Card>
            <div className=" text-text">
                <button onClick={() => navigate(-1)} className="mb-4 flex items-center ">
                    <IoArrowBack size={20} />
                </button>
                <h2 className="mb-4 text-xl font-bold ">Privacy Policy</h2>
                <ol className="pl-5 space-y-4">
                    <li>
                        <strong className="">Information We Do Not Collect:</strong>
                        <ul className="list-disc pl-5">
                            <li>We do not collect personal information.</li>
                            <li>We do not have access to your private keys, wallet passphrases, or account balances.</li>
                            <li>We do not track your IP address, browser activity, or identity.</li>
                            <li>Your data stays on your device, and your transactions occur directly on the blockchain.</li>
                        </ul>
                    </li>
                    <li>
                        <strong className="">Information We May Process Locally:</strong>
                        <ul className="list-disc pl-5">
                            <li>Public wallet addresses</li>
                            <li>Locally stored preferences (e.g., language, currency display)</li>
                            <li>Transaction history cached from the blockchain</li>
                        </ul>
                        None of this information is transmitted to our servers.
                    </li>
                    <li>
                        <strong className="">Third-Party APIs:</strong> Our extension may interact with third-party APIs (e.g., blockchain explorers, token price oracles) to display real-time information. These third parties may collect limited metadata (like IP address or request headers) in accordance with their own privacy policies. We recommend reviewing their privacy policies for more information.
                    </li>
                    <li>
                        <strong className="">Security:</strong>
                        <ul className="list-disc pl-5">
                            <li>Encryption of sensitive data stored locally</li>
                            <li>Secure communication with blockchain nodes</li>
                            <li>Code audits and updates to maintain extension integrity</li>
                        </ul>
                        However, no method of electronic transmission or storage is 100% secure.
                    </li>
                    <li>
                        <strong className="">Children’s Privacy:</strong> Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
                    </li>
                    <li>
                        <strong className="">Changes to This Policy:</strong> We may update this Privacy Policy from time to time. Any changes will be communicated via an in-extension notice or through our official website.
                    </li>
                    <li>
                        <strong className="">Contact Us:</strong> If you have questions or concerns about this policy, contact us at: <a href="mailto:support@xellwallet.com" className="text-blue-600">support@xellwallet.com</a>
                    </li>
                </ol>
            </div>
        </Card>
    );
}