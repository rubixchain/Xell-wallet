import { WALLET_TYPES } from "../enums";
import indexDBUtil from "../indexDB";
import { generateSignature, isSignatureRoundRequired } from "../utils";
import { END_POINTS } from "./endpoints";

// API endpoint mapping for cleaner code
const API_ENDPOINTS = {
  [WALLET_TYPES.EXECUTE_CONTRACT]: END_POINTS.execute_smart_contract,
  [WALLET_TYPES.INITIATE_TRANSFER_FT]: END_POINTS.initiate_ft_transfer,
  [WALLET_TYPES.INITIATE_DEPLOY_NFT]: END_POINTS.deploy_nft,
  [WALLET_TYPES.INITIATE_EXECUTE_NFT]: END_POINTS.execute_nft,
  [WALLET_TYPES.INITIATE_CREATE_FT]: END_POINTS.create_ft,
};

async function generateSignatureApi(id, hash, pk) {
  try {
    let signature = await generateSignature(pk, hash)
    let signatureResponse = await END_POINTS.signature_response({
      id: id,
      Signature: { Signature: signature },
      mode: 4
    })

    if (!signatureResponse || !signatureResponse?.status) {
      return {
        status: false,
        message: signatureResponse?.message || 'failed to do response'
      }
    }
    else if (isSignatureRoundRequired(signatureResponse?.result)) {
      return await generateSignatureApi(signatureResponse.result.id, signatureResponse.result.hash, pk)
    }
    else {
      return signatureResponse
    }
  }
  catch (e) {
    return {
      status: false,
      message: 'failed to do responses'
    }
  }
}

// Helper function to handle API response
async function handleApiResponse(apiResponse, pendingTabId, injectResultIntoWebpage) {
  // injectResultIntoWebpage(pendingTabId, { ...apiResponse });
  return apiResponse
}

// Helper function to get user private key
async function getUserPrivateKey(username, pin) {
  const userDetails = await indexDBUtil.getData('UserDetails', username, pin);

  if (!userDetails?.status) {
    return { status: false, error: userDetails?.message || 'Invalid credentials' };
  }

  return {
    status: true,
    privateKey: userDetails.privatekey
  };
}


export async function handleApiCall(type, data, pendingTabId, injectResultIntoWebpage) {
  try {
    // Get the appropriate API endpoint
    const apiEndpoint = API_ENDPOINTS[type];
    if (!apiEndpoint) {
      throw new Error(`Unsupported API type: ${type}`);
    }

    // Execute API call
    const apiResponse = await apiEndpoint({ ...data.payload });

    // Handle API response
    const apiSuccess = await handleApiResponse(apiResponse, pendingTabId, injectResultIntoWebpage);
    if (!apiSuccess?.status) {
      injectResultIntoWebpage(pendingTabId, apiSuccess);
      return {
        status: false
      };
    }
    // Get user private key
    const { status, privateKey, error: authError } = await getUserPrivateKey(data?.username, data?.pin);
    if (!status) {
      const errorResult = {
        status: false,
        message: authError
      };
      injectResultIntoWebpage(pendingTabId, errorResult);
      return errorResult;
    }

    // Handle signature and get the final result
    const signatureResponse = await generateSignatureApi(
      apiResponse?.result?.id,
      apiResponse?.result?.hash,
      privateKey
    );

    // Inject the final signature response
    injectResultIntoWebpage(pendingTabId, { ...signatureResponse });

    // Return the final signature response for promise resolution
    const finalResult = {
      status: signatureResponse?.status || false,
      data: signatureResponse?.result || signatureResponse
    };

    return finalResult;

  } catch (error) {
    // Handle unexpected errors
    const errorResult = {
      status: false,
      message: error?.message || "An unexpected error occurred"
    };
    injectResultIntoWebpage(pendingTabId, errorResult);
    return errorResult;
  }
}