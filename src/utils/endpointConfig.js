// Endpoint configuration for network URLs
// This file can be easily updated when backend endpoints change

export const ENDPOINT_TYPES = [
    { value: '/api', label: '/api (Default)', description: 'Standard API endpoint' },
    { value: '/v1', label: '/v1 (Version 1)', description: 'API version 1' },
    { value: '/v2', label: '/v2 (Version 2)', description: 'API version 2' },
    { value: '/graphql', label: '/graphql (GraphQL)', description: 'GraphQL endpoint' },
    { value: '/rest', label: '/rest (REST)', description: 'REST API endpoint' },
    { value: '/rpc', label: '/rpc (RPC)', description: 'RPC endpoint' },
    { value: '/ws', label: '/ws (WebSocket)', description: 'WebSocket endpoint' },
    { value: '', label: 'No endpoint (Custom)', description: 'No endpoint appended' }
];

// Default endpoint type for new networks
export const DEFAULT_ENDPOINT_TYPE = '/api';

// Function to validate if an endpoint type is supported
export const isValidEndpointType = (endpointType) => {
    return ENDPOINT_TYPES.some(type => type.value === endpointType);
};

// Function to get endpoint type by value
export const getEndpointTypeByValue = (value) => {
    return ENDPOINT_TYPES.find(type => type.value === value) || ENDPOINT_TYPES[0];
};

// Function to normalize URL with endpoint type
export const normalizeUrlWithEndpoint = (url, endpointType) => {
    if (!url) return url;
    
    let normalizedUrl = url;
    
    // Remove trailing slash
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    // Add endpoint type if provided and not already present
    if (endpointType && !normalizedUrl.endsWith(endpointType)) {
        normalizedUrl = normalizedUrl + endpointType;
    }
    
    // Remove trailing slash from endpoint
    if (endpointType && normalizedUrl.endsWith(endpointType + '/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    return normalizedUrl;
}; 