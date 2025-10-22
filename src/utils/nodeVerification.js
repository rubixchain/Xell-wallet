/**
 * Node Verification Utility
 * Handles swarm key verification for custom nodes
 */

/**
 * Get swarm key from a node
 * @param {string} nodeUrl - The URL of the node
 * @returns {Promise<{valid: boolean, swarmKey?: string, error?: string}>}
 */
export async function getNodeSwarmKey(nodeUrl) {
  // TODO: Implement actual API call when endpoint is ready
  // Expected endpoint: GET {nodeUrl}/api/swarm-key
  // Expected response: { status: true, swarmKey: "0x..." }

  // For now, return placeholder that allows all nodes
  return {
    valid: true,
    swarmKey: "PLACEHOLDER_SWARM_KEY"
  };

  /* Uncomment when actual API is ready:
  try {
    const response = await fetch(`${nodeUrl}/api/swarm-key`);
    const data = await response.json();

    if (!data.status || !data.swarmKey) {
      return {
        valid: false,
        error: 'Failed to fetch swarm key from node'
      };
    }

    return {
      valid: true,
      swarmKey: data.swarmKey
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to connect to node'
    };
  }
  */
}

/**
 * Verify that a node's swarm key matches the expected network swarm key
 * @param {string} nodeUrl - The URL of the node to verify
 * @param {string} expectedSwarmKey - The expected swarm key for the network
 * @returns {Promise<{valid: boolean, swarmKey?: string, error?: string, expected?: string, received?: string}>}
 */
export async function verifyNodeSwarmKey(nodeUrl, expectedSwarmKey) {
  try {
    const result = await getNodeSwarmKey(nodeUrl);

    if (!result.valid) {
      return result;
    }

    // TODO: Uncomment when actual API is ready
    // Compare swarm keys
    // if (result.swarmKey !== expectedSwarmKey) {
    //   return {
    //     valid: false,
    //     error: 'Swarm key mismatch',
    //     expected: expectedSwarmKey,
    //     received: result.swarmKey
    //   };
    // }

    return {
      valid: true,
      swarmKey: result.swarmKey
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to verify node: ' + error.message
    };
  }
}

/**
 * Check if a node is online and accessible
 * @param {string} nodeUrl - The URL of the node
 * @returns {Promise<boolean>}
 */
export async function isNodeOnline(nodeUrl) {
  try {
    // Try to ping the node
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(nodeUrl, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
